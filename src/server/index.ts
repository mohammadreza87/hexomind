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
  getSubredditLeaderboard,
  updateSubredditLeaderboard,
  getUserRank,
  getGameStatistics,
  incrementGamesPlayed
} from './api/highscores';

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

    const updated = await setUserHighScore(username, score);

    // Update daily leaderboard
    await updateDailyLeaderboard(username, score);

    // Update subreddit leaderboard if we have context
    if (context.subredditName) {
      await updateSubredditLeaderboard(username, score, context.subredditName);
    }

    // Increment games played counter
    await incrementGamesPlayed();

    const rank = await getUserRank(username);

    res.json({
      updated,
      highScore: updated ? score : await getUserHighScore(username),
      rank
    });
  } catch (error) {
    console.error('Error setting high score:', error);
    res.status(500).json({ error: 'Failed to set high score' });
  }
});

router.get('/api/leaderboard', async (req, res): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string || 'global';
    const date = req.query.date as string;

    let leaderboard;
    if (type === 'daily') {
      const today = date || new Date().toISOString().split('T')[0];
      leaderboard = await getDailyLeaderboard(today, limit);
    } else if (type === 'subreddit' && context.subredditName) {
      leaderboard = await getSubredditLeaderboard(context.subredditName, limit);
    } else {
      leaderboard = await getGlobalLeaderboard(limit);
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

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));
