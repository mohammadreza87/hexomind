import express, { type Request } from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, createServer, context, media } from '@devvit/web/server';
import { createPost, createChallengePost } from './core/post';
import { handleColormindRequest } from './api/colormind';
import {
  getUserHighScore,
  setUserHighScore,
  getGlobalLeaderboard,
  getDailyLeaderboard,
  updateDailyLeaderboard,
  getWeeklyLeaderboard,
  updateWeeklyLeaderboard,
  getSubredditLeaderboard,
  updateSubredditLeaderboard,
  getUserRank,
  getGameStatistics,
  incrementGamesPlayed
} from './api/highscores';
import { initializeLeaderboards, ensurePlayerInLeaderboard } from './api/dummyData';
import { normalizeLeaderboardEntries } from './utils/leaderboard';
import type { LeaderboardEntry, LeaderboardPeriod } from '../shared/types/leaderboard';

const USERNAME_RESERVATIONS_KEY = 'hexomind:usernames:reservations';
const USERNAME_OWNER_KEY = 'hexomind:usernames:owners';
const USER_ID_TO_USERNAME_KEY = 'hexomind:usernames:by-user';
const USERNAME_RESERVATION_TTL_MS = 5 * 60 * 1000;
const CLIENT_ID_HEADER = 'x-hexomind-client-id';

interface UsernameReservationRecord {
  userId: string;
  timestamp: number;
  username: string;
}

interface UsernameOwnerRecord {
  userId: string;
  username: string;
  normalized: string;
}

interface UserIdToUsernameRecord {
  username: string;
  normalized: string;
}

interface RequestIdentity {
  userId: string | null;
  clientId: string | null;
  contextUsername: string | null;
}

function parseJsonRecord<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse JSON record:', error);
    return null;
  }
}

async function updateSortedSetMember(
  key: string,
  oldMember: string,
  newMember: string
): Promise<void> {
  if (!oldMember || !newMember || oldMember === newMember) {
    return;
  }

  const existingScore = await redis.zScore(key, oldMember);
  const parsedScore = typeof existingScore === 'number'
    ? existingScore
    : existingScore !== null
      ? parseFloat(existingScore)
      : null;

  if (parsedScore === null || Number.isNaN(parsedScore)) {
    return;
  }

  await redis.zRem(key, [oldMember]);
  await redis.zAdd(key, { score: parsedScore, member: newMember });
}

async function moveHash(sourceKey: string, targetKey: string): Promise<void> {
  if (sourceKey === targetKey) {
    return;
  }

  const entries = await redis.hGetAll(sourceKey);
  if (!entries || Object.keys(entries).length === 0) {
    return;
  }

  await redis.hSet(targetKey, entries);
  await redis.del(sourceKey);
}

async function renameUserArtifacts(oldUsername: string | null, newUsername: string): Promise<void> {
  if (!oldUsername || oldUsername === newUsername) {
    return;
  }

  const oldScoreKey = `highscore:user:${oldUsername}`;
  const newScoreKey = `highscore:user:${newUsername}`;
  const existingScore = await redis.get(oldScoreKey);
  if (existingScore !== null) {
    await redis.set(newScoreKey, existingScore);
    await redis.del(oldScoreKey);
  }

  await moveHash(`highscore:meta:${oldUsername}`, `highscore:meta:${newUsername}`);

  const subredditMetaKeys = await redis.keys(`highscore:meta:${oldUsername}:*`);
  for (const key of subredditMetaKeys) {
    const suffix = key.slice(`highscore:meta:${oldUsername}:`.length);
    await moveHash(key, `highscore:meta:${newUsername}:${suffix}`);
  }

  await updateSortedSetMember('leaderboard:global', oldUsername, newUsername);

  const dailyKeys = await redis.keys('leaderboard:daily:*');
  for (const key of dailyKeys) {
    await updateSortedSetMember(key, oldUsername, newUsername);
  }

  const weeklyKeys = await redis.keys('leaderboard:weekly:*');
  for (const key of weeklyKeys) {
    await updateSortedSetMember(key, oldUsername, newUsername);
  }

  const subredditKeys = await redis.keys('leaderboard:subreddit:*');
  for (const key of subredditKeys) {
    await updateSortedSetMember(key, oldUsername, newUsername);
  }
}

function resolveRequestIdentity(req: Request): RequestIdentity {
  const headerValue = req.headers[CLIENT_ID_HEADER];
  const headerClientId = Array.isArray(headerValue)
    ? headerValue[0]
    : typeof headerValue === 'string'
      ? headerValue
      : null;

  const bodyClientId = req.body && typeof (req.body as any).clientId === 'string'
    ? (req.body as any).clientId
    : null;

  const clientId = (headerClientId ?? bodyClientId)?.trim() || null;
  const contextUsername = context.username || (context as any).author || null;

  if (context.userId) {
    return { userId: context.userId, clientId, contextUsername };
  }

  if (clientId) {
    return { userId: `client:${clientId}`, clientId, contextUsername };
  }

  if (contextUsername) {
    return { userId: `user:${contextUsername}`, clientId, contextUsername };
  }

  return { userId: null, clientId, contextUsername };
}

const app = express();

// Middleware for body parsing with increased payload limits for screenshot data
const bodyParserLimit = { limit: '4mb' };
app.use(express.json(bodyParserLimit));
app.use(express.urlencoded({ extended: true, ...bodyParserLimit }));
app.use(express.text(bodyParserLimit));

const router = express.Router();

let leaderboardInitialization: Promise<void> | null = null;

async function ensureLeaderboardsInitializedOnce(): Promise<void> {
  if (!leaderboardInitialization) {
    leaderboardInitialization = initializeLeaderboards().catch(error => {
      leaderboardInitialization = null;
      throw error;
    });
  }
  return leaderboardInitialization;
}

router.use(async (_req, _res, next): Promise<void> => {
  try {
    await ensureLeaderboardsInitializedOnce();
  } catch (error) {
    console.error('Error ensuring leaderboards are initialized:', error);
  }
  next();
});

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    // Log all available context properties for debugging
    console.log('Devvit context:', {
      postId: context.postId,
      subredditName: context.subredditName,
      userId: context.userId,
      username: context.username,
      // Try various possible property names
      author: (context as any).author,
      authorName: (context as any).authorName,
      user: (context as any).user,
      allKeys: Object.keys(context)
    });

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const count = await redis.get('count');
      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        // Include username if available
        username: context.username || (context as any).author || null
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Colormind API proxy endpoint
router.post('/api/colormind', async (req, res): Promise<void> => {
  const response = await handleColormindRequest(req as unknown as Request);
  const data = await response.json();
  res.json(data);
});

// High Score API endpoints
router.get('/api/highscore/:username', async (req, res): Promise<void> => {
  try {
    const { username } = req.params;
    const score = await getUserHighScore(username);
    res.json({ username, score });
  } catch (error) {
    console.error('Error getting high score:', error);
    res.status(500).json({ error: 'Failed to get high score' });
  }
});

router.get('/api/highscore/:username/rank', async (req, res): Promise<void> => {
  try {
    const { username } = req.params;
    const rank = await getUserRank(username);
    res.json({ username, rank });
  } catch (error) {
    console.error('Error getting user rank:', error);
    res.status(500).json({ error: 'Failed to get user rank' });
  }
});

router.post('/api/highscore', async (req, res): Promise<void> => {
  try {
    const { username } = req.body;
    const score = typeof req.body.score === 'number'
      ? Math.max(0, Math.floor(req.body.score))
      : NaN;

    if (!username || !Number.isFinite(score)) {
      res.status(400).json({ error: 'Username and score are required' });
      return;
    }

    // Set a timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), 4000)
    );

    // Run all operations with timeout
    const result = await Promise.race([
      timeoutPromise,
      (async () => {
        const updated = await setUserHighScore(username, score);
        const authoritativeScore = updated ? score : await getUserHighScore(username);

        // Ensure player appears in all leaderboards using their best score
        await ensurePlayerInLeaderboard(username, authoritativeScore);

        // Ensure leaderboard mirrors are updated before responding
        await Promise.all([
          updateDailyLeaderboard(username, authoritativeScore).catch(err =>
            console.error('Failed to update daily leaderboard:', err)
          ),
          updateWeeklyLeaderboard(username, authoritativeScore).catch(err =>
            console.error('Failed to update weekly leaderboard:', err)
          ),
          context.subredditName ?
            updateSubredditLeaderboard(username, authoritativeScore, context.subredditName).catch(err =>
              console.error('Failed to update subreddit leaderboard:', err)
            ) : Promise.resolve(),
          incrementGamesPlayed().catch(err =>
            console.error('Failed to increment games played:', err)
          )
        ]);

        // Only get rank if score was updated
        const rank = updated ? await getUserRank(username) : null;
        const highScore = authoritativeScore;

        return {
          updated,
          highScore,
          rank
        };
      })()
    ]);

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Operation timeout') {
      console.error('Highscore operation timed out');
      res.status(408).json({ error: 'Request timeout' });
    } else {
      console.error('Error setting high score:', error);
      res.status(500).json({ error: 'Failed to set high score' });
    }
  }
});

router.get('/api/leaderboard', async (req, res): Promise<void> => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 100)
      : 10;

    const rawType = (req.query.type as string | undefined)?.toLowerCase();
    const allowedTypes: LeaderboardPeriod[] = ['daily', 'weekly', 'subreddit', 'global'];
    const type: LeaderboardPeriod = allowedTypes.includes(rawType as LeaderboardPeriod)
      ? (rawType as LeaderboardPeriod)
      : 'global';
    const date = req.query.date as string;
    const requestedUsername = typeof req.query.username === 'string' && req.query.username.trim().length > 0
      ? req.query.username.trim()
      : null;

    console.log(`Fetching ${type} leaderboard with limit ${limit}`);

    let leaderboard: LeaderboardEntry[] = [];
    if (type === 'daily') {
      const today = date || new Date().toISOString().split('T')[0];
      console.log(`Fetching daily leaderboard for ${today}`);
      leaderboard = await getDailyLeaderboard(today, limit, requestedUsername ?? undefined);
    } else if (type === 'weekly') {
      console.log('Fetching weekly leaderboard');
      leaderboard = await getWeeklyLeaderboard(limit, requestedUsername ?? undefined);
    } else if (type === 'subreddit' && context.subredditName) {
      console.log(`Fetching subreddit leaderboard for ${context.subredditName}`);
      leaderboard = await getSubredditLeaderboard(context.subredditName, limit);
    } else {
      console.log('Fetching global leaderboard');
      leaderboard = await getGlobalLeaderboard(limit, requestedUsername ?? undefined);
    }

    leaderboard = normalizeLeaderboardEntries(leaderboard);

    console.log(`Leaderboard result: ${leaderboard.length} entries`);
    if (leaderboard.length > 0) {
      console.log('First entry:', leaderboard[0]);
    }

    // If empty, try to initialize with dummy data
    if (leaderboard.length === 0) {
      console.log('Leaderboard empty, initializing with dummy data...');
      await initializeLeaderboards();
      // Retry fetching
      if (type === 'daily') {
        const today = date || new Date().toISOString().split('T')[0];
        leaderboard = await getDailyLeaderboard(today, limit, requestedUsername ?? undefined);
      } else if (type === 'weekly') {
        leaderboard = await getWeeklyLeaderboard(limit, requestedUsername ?? undefined);
      } else {
        leaderboard = await getGlobalLeaderboard(limit, requestedUsername ?? undefined);
      }
      leaderboard = normalizeLeaderboardEntries(leaderboard);
      console.log(`After initialization: ${leaderboard.length} entries`);
    }

    res.json({ leaderboard, type });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

router.get('/api/stats', async (_req, res): Promise<void> => {
  try {
    const stats = await getGameStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Initialize dummy data endpoint (can be called manually if needed)
router.post('/api/initialize-leaderboards', async (_req, res): Promise<void> => {
  try {
    await initializeLeaderboards();
    res.json({ success: true, message: 'Leaderboards initialized with dummy data' });
  } catch (error) {
    console.error('Error initializing leaderboards:', error);
    res.status(500).json({ error: 'Failed to initialize leaderboards' });
  }
});

// Get current user endpoint
router.get('/api/current-user', async (req, res): Promise<void> => {
  try {
    const { userId, clientId, contextUsername } = resolveRequestIdentity(req);
    let customUsername: string | null = null;

    if (userId) {
      const record = parseJsonRecord<UserIdToUsernameRecord>(
        await redis.hGet(USER_ID_TO_USERNAME_KEY, userId)
      );
      if (record?.username) {
        customUsername = record.username;
      }
    }

    res.json({
      username: customUsername ?? contextUsername,
      customUsername,
      userId,
      clientId,
      postId: context.postId,
      subreddit: context.subredditName,
      contextKeys: Object.keys(context)
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get current user' });
  }
});

// Check username availability
router.post('/api/check-username', async (req, res): Promise<void> => {
  try {
    const { username } = req.body;
    const { userId } = resolveRequestIdentity(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required', available: false });
      return;
    }

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required', available: false });
      return;
    }

    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({
        error: 'Invalid username format',
        available: false
      });
      return;
    }

    const normalized = username.toLowerCase();
    const existingOwner = parseJsonRecord<UsernameOwnerRecord>(
      await redis.hGet(USERNAME_OWNER_KEY, normalized)
    );

    if (existingOwner && existingOwner.userId !== userId) {
      res.json({
        available: false,
        message: 'Username already taken'
      });
      return;
    }

    const reservation = parseJsonRecord<UsernameReservationRecord>(
      await redis.hGet(USERNAME_RESERVATIONS_KEY, normalized)
    );

    if (reservation) {
      const expired = Date.now() - reservation.timestamp > USERNAME_RESERVATION_TTL_MS;
      if (expired) {
        await redis.hDel(USERNAME_RESERVATIONS_KEY, [normalized]);
      } else if (reservation.userId !== userId) {
        res.json({
          available: false,
          message: 'Username currently reserved'
        });
        return;
      }
    }

    const reservationRecord: UsernameReservationRecord = {
      userId,
      timestamp: Date.now(),
      username
    };

    await redis.hSet(USERNAME_RESERVATIONS_KEY, {
      [normalized]: JSON.stringify(reservationRecord)
    });
    await redis.expire(USERNAME_RESERVATIONS_KEY, Math.ceil(USERNAME_RESERVATION_TTL_MS / 1000));

    res.json({
      available: true,
      message: 'Username is available'
    });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Failed to check username availability' });
  }
});

router.post('/api/commit-username', async (req, res): Promise<void> => {
  try {
    const { username } = req.body;
    const { userId } = resolveRequestIdentity(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ error: 'Invalid username format' });
      return;
    }

    const normalized = username.toLowerCase();

    const reservation = parseJsonRecord<UsernameReservationRecord>(
      await redis.hGet(USERNAME_RESERVATIONS_KEY, normalized)
    );

    if (!reservation || reservation.userId !== userId) {
      res.status(409).json({ error: 'Username reservation missing or expired' });
      return;
    }

    if (Date.now() - reservation.timestamp > USERNAME_RESERVATION_TTL_MS) {
      await redis.hDel(USERNAME_RESERVATIONS_KEY, [normalized]);
      res.status(409).json({ error: 'Username reservation missing or expired' });
      return;
    }

    const existingOwner = parseJsonRecord<UsernameOwnerRecord>(
      await redis.hGet(USERNAME_OWNER_KEY, normalized)
    );

    if (existingOwner && existingOwner.userId !== userId) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    const previousRecord = parseJsonRecord<UserIdToUsernameRecord>(
      await redis.hGet(USER_ID_TO_USERNAME_KEY, userId)
    );
    const previousUsername = previousRecord?.username ?? null;
    const previousNormalized = previousRecord?.normalized ?? null;

    if (previousNormalized && previousNormalized !== normalized) {
      await redis.hDel(USERNAME_OWNER_KEY, [previousNormalized]);
    }

    const ownerRecord: UsernameOwnerRecord = { userId, username, normalized };
    await redis.hSet(USERNAME_OWNER_KEY, {
      [normalized]: JSON.stringify(ownerRecord)
    });

    await redis.hSet(USER_ID_TO_USERNAME_KEY, {
      [userId]: JSON.stringify({ username, normalized })
    });

    await renameUserArtifacts(previousUsername, username);

    await redis.hDel(USERNAME_RESERVATIONS_KEY, [normalized]);

    res.json({ success: true, username, previousUsername });
  } catch (error) {
    console.error('Error committing username:', error);
    res.status(500).json({ error: 'Failed to save username' });
  }
});

/**
 * Share Score Challenge - Viral mechanics for social sharing
 * Creates engaging Reddit posts to drive community challenges
 */
router.post('/api/share-challenge', async (req, res): Promise<void> => {
  try {
    const { score, username, rank, period = 'global', screenshot } = req.body;

    if (!score || !username) {
      res.status(400).json({ error: 'Score and username required' });
      return;
    }

    let screenshotUrl: string | null = null;

    if (typeof screenshot === 'string' && screenshot.startsWith('data:image/')) {
      if (screenshot.length > 3_000_000) {
        console.warn('Screenshot payload too large, skipping upload');
      } else {
        try {
          const upload = await media.upload({
            url: screenshot,
            type: 'image'
          });
          screenshotUrl = upload.mediaUrl;
        } catch (uploadError) {
          console.error('Failed to upload challenge screenshot:', uploadError);
        }
      }
    }

    // Viral title generation with psychological triggers
    const getRankEmoji = (rank: number) => {
      if (rank === 1) return '👑';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      if (rank <= 10) return '🔥';
      if (rank <= 25) return '⭐';
      if (rank <= 50) return '💪';
      if (rank <= 100) return '🎯';
      return '🎮';
    };

    const getScoreLevel = (score: number) => {
      if (score >= 50000) return 'GODLIKE';
      if (score >= 25000) return 'LEGENDARY';
      if (score >= 10000) return 'MASTER';
      if (score >= 5000) return 'EXPERT';
      if (score >= 2500) return 'PRO';
      if (score >= 1000) return 'SKILLED';
      if (score >= 500) return 'RISING STAR';
      return 'CHALLENGER';
    };

    const level = getScoreLevel(score);
    const emoji = getRankEmoji(rank);
    const formattedScore = score.toLocaleString();

    // Viral title formats with A/B testing variety
    const titleFormats = [
      `${emoji} Can you beat my ${level} score? I got ${formattedScore} points in Hexomind! ${emoji}`,
      `${emoji} ${username} just DESTROYED with ${formattedScore} points! Think you can beat it? 🎮`,
      `🚨 NEW ${level} PLAYER: ${formattedScore} points! Can anyone beat ${username}? ${emoji}`,
      `${emoji} Rank #${rank} with ${formattedScore} points! Who's taking my crown? 👑`,
      `💥 ${level} ALERT: ${formattedScore} points! Beat me if you can! 🎯 #Hexomind`,
      `🔥 Just hit ${formattedScore} in Hexomind! ${username} challenges YOU! ${emoji}`,
      `⚡ ${level} MODE: ${formattedScore} points! Show me what you got! 🎮`,
      `🎯 Challenge Accepted? Beat my ${formattedScore} score! - ${username} ${emoji}`
    ];

    const title = titleFormats[Math.floor(Math.random() * titleFormats.length)];

    // Create the viral challenge post with custom title
    const post = await createChallengePost(title, screenshotUrl ?? undefined);

    const challengeId = `challenge:${Date.now()}:${username}`;

    // Store challenge data for tracking
    await redis.hSet(challengeId, {
      challengerName: username,
      challengeScore: score.toString(),
      challengerRank: rank.toString(),
      period,
      postId: post.id,
      timestamp: Date.now().toString(),
      subreddit: context.subredditName || '',
      screenshotUrl: screenshotUrl ?? ''
    });

    // Track share analytics (manual increment since hincrby is not available in Devvit)
    const shareKey = `shares:${context.subredditName}:${new Date().toISOString().split('T')[0]}`;
    const shareData = await redis.hGetAll(shareKey);
    const currentTotal = parseInt(shareData?.total || '0');
    const currentUserShares = parseInt(shareData?.[username] || '0');
    await redis.hSet(shareKey, {
      total: (currentTotal + 1).toString(),
      [username]: (currentUserShares + 1).toString()
    });

    // Increment user's share count for rewards/achievements (manual increment)
    const userStatsKey = `user:${username}:stats`;
    const userStats = await redis.hGetAll(userStatsKey);
    const currentShares = parseInt(userStats?.shares || '0');
    const currentViralScore = parseInt(userStats?.viral_score || '0');
    await redis.hSet(userStatsKey, {
      shares: (currentShares + 1).toString(),
      viral_score: (currentViralScore + Math.floor(score / 100)).toString()
    });

    // Add to trending challenges list
    await redis.zAdd(`trending:challenges`, {
      score: Date.now(),
      member: challengeId
    });

    // Expire old challenges after 7 days
    await redis.expire(challengeId, 7 * 24 * 60 * 60);

    res.json({
      success: true,
      postId: post.id,
      postUrl: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      challengeId,
      message: '🔥 Challenge posted! Let the games begin!',
      viralScore: Math.floor(score / 100),
      screenshotUrl: screenshotUrl ?? null
    });

  } catch (error: any) {
    console.error('Failed to share challenge:', error);
    res.status(500).json({
      error: 'Failed to create challenge',
      details: error?.message
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
