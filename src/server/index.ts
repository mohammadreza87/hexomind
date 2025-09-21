import express, { type Request } from 'express';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, createServer, context, media, reddit } from '@devvit/web/server';
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
  incrementGamesPlayed,
  resetUserHighScore
} from './api/highscores';
import { initializeLeaderboards, ensurePlayerInLeaderboard } from './api/dummyData';
import { normalizeLeaderboardEntries } from './utils/leaderboard';
import { logger } from './utils/logger';
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
    logger.warn('Failed to parse JSON record:', error);
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

  // Handle subreddit-specific meta keys (if we have context)
  if (context.subredditName) {
    await moveHash(
      `highscore:meta:${oldUsername}:${context.subredditName}`,
      `highscore:meta:${newUsername}:${context.subredditName}`
    );
  }

  await updateSortedSetMember('leaderboard:global', oldUsername, newUsername);

  // Update recent daily leaderboards (last 7 days)
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    await updateSortedSetMember(`leaderboard:daily:${dateKey}`, oldUsername, newUsername);
  }

  // Update recent weekly leaderboards (last 4 weeks)
  function getISOWeek(date: Date): number {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  for (let i = 0; i < 4; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 7));
    const year = date.getFullYear();
    const week = getISOWeek(date);
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
    await updateSortedSetMember(`leaderboard:weekly:${weekKey}`, oldUsername, newUsername);
  }

  // Update subreddit leaderboard if we have context
  if (context.subredditName) {
    await updateSortedSetMember(`leaderboard:subreddit:${context.subredditName}`, oldUsername, newUsername);
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

type TransientScreenshot = {
  buffer: Buffer;
  mime: string;
  expiresAt: number;
};

const transientScreenshots = new Map<string, TransientScreenshot>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In Devvit environment, the server runs from /srv, so we need to handle this specially
// When running locally, it's at dist/server or src/server
const isDevvitEnvironment = __dirname === '/srv';
const projectRoot = isDevvitEnvironment ? '' : join(__dirname, '..', '..');

const splashAssetCandidates: Array<{ path: string; mime: string }> = isDevvitEnvironment ? [
  // For Devvit environment (paths relative to root)
  { path: '/dist/client/assets/splash-grid.png', mime: 'image/png' },
  { path: '/dist/client/assets/splash-grid.svg', mime: 'image/svg+xml' },
  { path: '/dist/client/assets/splash/hex-grid.svg', mime: 'image/svg+xml' },
  // Try without dist prefix as well
  { path: '/client/assets/splash-grid.png', mime: 'image/png' },
  { path: '/client/assets/splash-grid.svg', mime: 'image/svg+xml' },
  { path: '/assets/splash-grid.png', mime: 'image/png' },
  { path: '/assets/splash-grid.svg', mime: 'image/svg+xml' },
] : [
  // For local development (paths relative to project root)
  { path: join(projectRoot, 'dist/client/assets/splash-grid.png'), mime: 'image/png' },
  { path: join(projectRoot, 'dist/client/assets/splash-grid.svg'), mime: 'image/svg+xml' },
  { path: join(projectRoot, 'dist/client/assets/splash/hex-grid.svg'), mime: 'image/svg+xml' },
  { path: join(projectRoot, 'src/client/public/assets/splash-grid.png'), mime: 'image/png' },
  { path: join(projectRoot, 'src/client/public/assets/splash-grid.svg'), mime: 'image/svg+xml' },
  { path: join(projectRoot, 'src/client/public/assets/splash/hex-grid.svg'), mime: 'image/svg+xml' },
];

let splashAssetBuffer: Buffer | null = null;
let splashAssetMime = 'image/png';

// Try to load splash asset, but it's optional
for (const candidate of splashAssetCandidates) {
  if (existsSync(candidate.path)) {
    try {
      splashAssetBuffer = readFileSync(candidate.path);
      splashAssetMime = candidate.mime;
      console.log('[splash] Using splash asset from:', candidate.path);
      break;
    } catch (err) {
      // Continue to next candidate
    }
  }
}

// Only log if we're not in the Devvit environment (to reduce noise)
if (!splashAssetBuffer && !isDevvitEnvironment) {
  console.log('[splash] No splash asset found (optional)');
}

router.get('/internal/assets/splash-grid.png', (_req, res): void => {
  if (!splashAssetBuffer) {
    res.status(404).send('Splash asset not available');
    return;
  }

  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.type(splashAssetMime).send(splashAssetBuffer);
});

function storeTransientScreenshot(buffer: Buffer, mime: string): string {
  const id = randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  transientScreenshots.set(id, { buffer, mime, expiresAt });
  setTimeout(() => transientScreenshots.delete(id), 5 * 60 * 1000).unref?.();
  return id;
}

function getRequestOrigin(req: Request): string {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto ?? req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

function getScreenshotUrl(req: Request, id: string): string {
  return `${getRequestOrigin(req)}/share-screenshot/${id}`;
}

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
    logger.debug('Devvit context:', {
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

router.post('/internal/on-app-install', async (req, res): Promise<void> => {
  try {
    // Validate context before proceeding
    if (!context.subredditName) {
      console.error('Install error: subredditName not available in context');
      // For app install triggers, return simple success/error status
      res.status(200).json({
        success: false,
        error: 'Subreddit context not available',
      });
      return;
    }

    const origin = getRequestOrigin(req);
    const post = await createPost({ origin });

    res.status(200).json({
      success: true,
      postId: post.id,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    // Return status 200 for trigger endpoints as Reddit expects
    res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create post'
    });
  }
});

router.post('/internal/menu/post-create', async (req, res): Promise<void> => {
  try {
    // Validate context before proceeding
    if (!context.subredditName) {
      console.error('Menu action error: subredditName not available in context');
      // Menu actions must return only valid UI response fields: showToast, navigateTo, or showForm
      res.status(200).json({
        showToast: 'Subreddit context not available'
      });
      return;
    }

    const origin = getRequestOrigin(req);
    const post = await createPost({ origin });

    // Return only valid UI response fields
    res.status(200).json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    // For menu actions, use showToast for errors (valid UI response field)
    res.status(200).json({
      showToast: error instanceof Error ? `Failed to create post: ${error.message}` : 'Failed to create post'
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
    const reset = req.body?.reset === true;

    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    if (reset) {
      await resetUserHighScore(username);
      res.json({ updated: true, highScore: 0, rank: null, reset: true });
      return;
    }

    const score = typeof req.body.score === 'number'
      ? Math.max(0, Math.floor(req.body.score))
      : NaN;

    if (!Number.isFinite(score)) {
      res.status(400).json({ error: 'Score must be provided for updates' });
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
          updateDailyLeaderboard(username, score).catch(err =>
            console.error('Failed to update daily leaderboard:', err)
          ),
          updateWeeklyLeaderboard(username, score).catch(err =>
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

    logger.debug(`Fetching ${type} leaderboard with limit ${limit}`);

    let leaderboard: LeaderboardEntry[] = [];
    if (type === 'daily') {
      const today = date || new Date().toISOString().split('T')[0];
      logger.debug(`Fetching daily leaderboard for ${today}`);
      leaderboard = await getDailyLeaderboard(today, limit, requestedUsername ?? undefined);
    } else if (type === 'weekly') {
      logger.debug('Fetching weekly leaderboard');
      leaderboard = await getWeeklyLeaderboard(limit, requestedUsername ?? undefined);
    } else if (type === 'subreddit' && context.subredditName) {
      logger.debug(`Fetching subreddit leaderboard for ${context.subredditName}`);
      leaderboard = await getSubredditLeaderboard(context.subredditName, limit);
    } else {
      logger.debug('Fetching global leaderboard');
      leaderboard = await getGlobalLeaderboard(limit, requestedUsername ?? undefined);
    }

    leaderboard = normalizeLeaderboardEntries(leaderboard);

    logger.debug(`Leaderboard result: ${leaderboard.length} entries`);
    if (leaderboard.length > 0) {
      logger.debug('First entry:', leaderboard[0]);
    }

    // If empty, try to initialize with dummy data
    if (leaderboard.length === 0) {
      logger.debug('Leaderboard empty, initializing with dummy data...');
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
      logger.debug(`After initialization: ${leaderboard.length} entries`);
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
router.get('/internal/assets/splash-grid.png', (req, res): void => {
  if (!splashAssetBuffer) {
    console.error('[splash] No splash asset buffer available');
    res.status(404).end();
    return;
  }

  res.setHeader('Content-Type', splashAssetMime);
  res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
  res.send(splashAssetBuffer);
});

router.get('/share-screenshot/:id', (req, res): void => {
  const { id } = req.params;
  const entry = transientScreenshots.get(id);
  if (!entry) {
    res.status(404).end();
    return;
  }

  if (entry.expiresAt <= Date.now()) {
    transientScreenshots.delete(id);
    res.status(410).end();
    return;
  }

  res.setHeader('Content-Type', entry.mime || 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=300, immutable');
  res.send(entry.buffer);
});

router.get('/api/share-status', async (req, res): Promise<void> => {
  try {
    const queryUsername = req.query?.username;
    const username = typeof queryUsername === 'string' ? queryUsername.trim() : null;

    if (!username) {
      res.status(400).json({ error: 'Username required' });
      return;
    }

    if (!context.subredditName) {
      res.status(400).json({ error: 'Subreddit context unavailable' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const shareKey = `shares:${context.subredditName}:${today}`;
    const shareCountRaw = await redis.hGet(shareKey, username);
    const shareCountToday = shareCountRaw ? parseInt(shareCountRaw, 10) || 0 : 0;

    const userStatsKey = `user:${username}:stats`;
    const userStats = await redis.hGetAll(userStatsKey);
    const totalShares = parseInt(userStats?.shares || '0', 10) || 0;
    const lastShareAt = userStats?.last_share_at ? parseInt(userStats.last_share_at, 10) || null : null;

    res.json({
      sharedToday: shareCountToday > 0,
      shareCountToday,
      totalShares,
      lastShareAt,
    });
  } catch (error) {
    console.error('Error fetching share status:', error);
    res.status(500).json({ error: 'Failed to load share status' });
  }
});

router.get('/api/gaming-communities', async (req, res): Promise<void> => {
  try {
    // Curated list of gaming communities where Hexomind would be appropriate
    const communities = [
      'gaming',
      'WebGames',
      'IndieGaming',
      'casualgames',
      'browserGames',
      'puzzlegames',
      'hexagon',
      'mobilegaming',
      'incremental_games',
      'playmygame',
      'gamedev',
      'unity3d',
      'indiedev',
      'iosgaming',
      'AndroidGaming'
    ];

    // Add user profile option if user is available
    const userProfileOptions = [];
    if (context.username) {
      userProfileOptions.push({
        id: 'user_profile',
        label: `u/${context.username} (Your Profile)`,
        type: 'profile'
      });
    }

    res.json({
      communities: communities.sort(),
      userProfileOptions,
      currentUser: context.username,
      success: true
    });
  } catch (error) {
    console.error('Failed to fetch gaming communities:', error);
    res.status(500).json({
      error: 'Failed to fetch communities',
      communities: [],
      userProfileOptions: []
    });
  }
});

router.post('/api/share-challenge', async (req, res): Promise<void> => {
  try {
    const { score, username, rank, period = 'global', targetSubreddit } = req.body;

    if (!score || !username) {
      res.status(400).json({ error: 'Score and username required' });
      return;
    }

    // Always use hexomind-splash.gif - no screenshot processing needed
    console.log('[SHARE DEBUG] Using default hexomind-splash.gif for share challenge');

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

    console.log('[SHARE DEBUG] Creating post', {
      title
    });

    // Create the viral challenge post with custom title (always uses hexomind-splash.gif)
    const origin = getRequestOrigin(req);
    let useSubreddit = targetSubreddit === 'current' ? context.subredditName : targetSubreddit;

    // Handle user profile sharing
    if (targetSubreddit === 'user_profile') {
      useSubreddit = `u_${context.username}`; // Reddit user profile format
    }

    let post;
    let actualSubreddit = useSubreddit;

    try {
      // Try to post to the requested subreddit
      post = await createChallengePost(title, undefined, {
        origin,
        targetSubreddit: useSubreddit,
        isUserProfile: targetSubreddit === 'user_profile'
      });
    } catch (error: any) {
      // If permission denied, fallback to current subreddit
      if (error?.code === 7 || error?.details?.includes('not allowed to post')) {
        console.log(`[SHARE] Permission denied for ${useSubreddit}, falling back to current subreddit`);

        // Only fallback if we weren't already trying the current subreddit
        if (useSubreddit !== context.subredditName && targetSubreddit !== 'current') {
          actualSubreddit = context.subredditName;
          post = await createChallengePost(title, undefined, {
            origin,
            targetSubreddit: actualSubreddit,
            isUserProfile: false
          });

          // Include a warning in the response
          res.locals.permissionWarning = `Note: You don't have permission to post to r/${useSubreddit}. The challenge was posted to the current subreddit instead.`;
        } else {
          // If we can't even post to current subreddit, throw the error
          throw error;
        }
      } else {
        // Re-throw non-permission errors
        throw error;
      }
    }

    const challengeId = `challenge:${Date.now()}:${username}`;

    // Store challenge data for tracking
    await redis.hSet(challengeId, {
      challengerName: username,
      challengeScore: score.toString(),
      challengerRank: rank.toString(),
      period,
      postId: post.id,
      timestamp: Date.now().toString(),
      subreddit: context.subredditName || ''
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
    const now = Date.now();
    await redis.hSet(userStatsKey, {
      shares: (currentShares + 1).toString(),
      viral_score: (currentViralScore + Math.floor(score / 100)).toString(),
      last_share_at: now.toString()
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
      postUrl: `https://reddit.com/r/${actualSubreddit}/comments/${post.id}`,
      challengeId,
      message: res.locals.permissionWarning || '🔥 Challenge posted! Let the games begin!',
      viralScore: Math.floor(score / 100),
      screenshotUrl: null,
      lastShareAt: now,
      actualSubreddit: actualSubreddit !== useSubreddit ? actualSubreddit : undefined
    });

  } catch (error: any) {
    console.error('Failed to share challenge:', error);

    // If we can't post anywhere, generate a shareable link instead
    if (error?.code === 7 || error?.details?.includes('not allowed to post')) {
      // Generate a share URL that can be copied and pasted
      const shareableUrl = `https://reddit.com/r/hexomind?challenge=${encodeURIComponent(JSON.stringify({
        score: req.body.score,
        username: req.body.username,
        rank: req.body.rank,
        period: req.body.period || 'global'
      }))}`;

      // Generate social media text
      const tweetText = encodeURIComponent(`🔥 I just scored ${req.body.score.toLocaleString()} points in #Hexomind! Can you beat my score? 🎮`);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

      res.json({
        success: true,
        fallbackMode: true,
        message: 'Generated shareable links - copy and share anywhere!',
        shareableUrl,
        twitterUrl,
        shareText: `Challenge: Beat my score of ${req.body.score.toLocaleString()}!`,
        score: req.body.score,
        username: req.body.username,
        rank: req.body.rank
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create challenge',
      details: error?.message
    });
  }
});

// Post comment to Reddit post
router.post('/api/post-comment', async (req, res): Promise<void> => {
  try {
    const { score, username, rank, period = 'global' } = req.body;

    console.log('[Comment API] Request received:', { score, username, rank, period });
    console.log('[Comment API] Context:', {
      postId: context.postId,
      subredditName: context.subredditName,
      userId: context.userId
    });

    if (!context.postId) {
      console.error('[Comment API] No post context available');
      res.status(400).json({ error: 'No post context available' });
      return;
    }

    if (!score || !username) {
      console.error('[Comment API] Missing required fields');
      res.status(400).json({ error: 'Score and username required' });
      return;
    }

    // Format the comment text
    const getScoreLevel = (score: number) => {
      if (score >= 50000) return '🏆 GODLIKE';
      if (score >= 25000) return '⭐ LEGENDARY';
      if (score >= 10000) return '🎯 MASTER';
      if (score >= 5000) return '💪 EXPERT';
      if (score >= 2500) return '🔥 PRO';
      if (score >= 1000) return '✨ SKILLED';
      if (score >= 500) return '🌟 RISING STAR';
      return '🎮 CHALLENGER';
    };

    const getRankEmoji = (rank: number) => {
      if (rank === 1) return '👑';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      if (rank <= 10) return '🔥';
      if (rank <= 25) return '⭐';
      return '🎯';
    };

    const level = getScoreLevel(score);
    const rankEmoji = rank ? getRankEmoji(rank) : '';
    const formattedScore = score.toLocaleString();

    let commentText = `## ${level} Score!\n\n`;
    commentText += `**Player:** ${username}\n\n`;
    commentText += `**Score:** ${formattedScore} points\n\n`;

    if (rank) {
      const periodLabel = period === 'daily' ? 'Daily' :
                         period === 'weekly' ? 'Weekly' :
                         period === 'subreddit' ? 'Subreddit' : 'Global';
      commentText += `**${periodLabel} Rank:** #${rank} ${rankEmoji}\n\n`;
    }

    commentText += `---\n\n`;
    commentText += `*Can you beat this score? Play Hexomind now!*`;

    console.log('[Comment API] Attempting to submit comment to post:', context.postId);
    console.log('[Comment API] Comment text:', commentText);

    // Check if reddit API is available
    if (!reddit || !reddit.submitComment) {
      console.error('[Comment API] Reddit API not available or submitComment method missing');
      res.status(503).json({
        error: 'Reddit API not available',
        message: 'Comment feature is currently unavailable'
      });
      return;
    }

    // Submit the comment to the Reddit post
    // Try different formats for the post ID
    let comment;
    try {
      // First try with t3_ prefix
      comment = await reddit.submitComment({
        id: `t3_${context.postId}`,
        text: commentText
      });
    } catch (firstError: any) {
      console.error('[Comment API] Failed with t3_ prefix:', firstError?.message);

      // Try without prefix
      try {
        comment = await reddit.submitComment({
          id: context.postId,
          text: commentText
        });
      } catch (secondError: any) {
        console.error('[Comment API] Failed without prefix:', secondError?.message);
        throw secondError;
      }
    }

    console.log('[Comment API] Comment posted successfully:', comment?.id);

    res.json({
      success: true,
      message: 'Score posted to comments!',
      commentId: comment?.id || 'unknown'
    });

  } catch (error: any) {
    console.error('[Comment API] Failed to post comment:', error);
    console.error('[Comment API] Error details:', {
      message: error?.message,
      code: error?.code,
      statusCode: error?.statusCode,
      stack: error?.stack
    });

    res.status(500).json({
      error: 'Failed to post comment',
      details: error?.message || 'Unknown error',
      code: error?.code
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
  logger.info(`http://localhost:${port}`);
});
