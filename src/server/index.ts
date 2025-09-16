import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, createServer, context } from '@devvit/web/server';
import { createPost } from './core/post';
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

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

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
    const { username, score } = req.body;

    if (!username || typeof score !== 'number') {
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

        // Fire and forget for non-critical updates to avoid blocking
        Promise.all([
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
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string || 'global';
    const date = req.query.date as string;

    console.log(`Fetching ${type} leaderboard with limit ${limit}`);

    let leaderboard;
    if (type === 'daily') {
      const today = date || new Date().toISOString().split('T')[0];
      console.log(`Fetching daily leaderboard for ${today}`);
      leaderboard = await getDailyLeaderboard(today, limit);
    } else if (type === 'weekly') {
      console.log('Fetching weekly leaderboard');
      leaderboard = await getWeeklyLeaderboard(limit);
    } else if (type === 'subreddit' && context.subredditName) {
      console.log(`Fetching subreddit leaderboard for ${context.subredditName}`);
      leaderboard = await getSubredditLeaderboard(context.subredditName, limit);
    } else {
      console.log('Fetching global leaderboard');
      leaderboard = await getGlobalLeaderboard(limit);
    }

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
        leaderboard = await getDailyLeaderboard(today, limit);
      } else if (type === 'weekly') {
        leaderboard = await getWeeklyLeaderboard(limit);
      } else {
        leaderboard = await getGlobalLeaderboard(limit);
      }
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
router.get('/api/current-user', async (_req, res): Promise<void> => {
  try {
    // Try to get username from context
    const username = context.username ||
                    context.userId ||
                    (context as any).author ||
                    (context as any).user ||
                    null;

    res.json({
      username,
      userId: context.userId,
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

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    // Validate username format
    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({
        error: 'Invalid username format',
        available: false
      });
      return;
    }

    // Check if username is already taken
    const customUsernamesKey = 'hexomind:custom_usernames';
    const existingUser = await redis.hGet(customUsernamesKey, username.toLowerCase());

    if (existingUser) {
      res.json({
        available: false,
        message: 'Username already taken'
      });
    } else {
      // Reserve the username temporarily (expires in 5 minutes)
      await redis.hSet(customUsernamesKey, {
        [username.toLowerCase()]: JSON.stringify({
          reserved: true,
          timestamp: Date.now(),
          userId: context.userId || 'anonymous'
        })
      });

      res.json({
        available: true,
        message: 'Username is available'
      });
    }
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Failed to check username availability' });
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

  // Initialize leaderboards with dummy data on startup
  initializeLeaderboards().catch(err =>
    console.error('Failed to initialize leaderboards on startup:', err)
  );
});
