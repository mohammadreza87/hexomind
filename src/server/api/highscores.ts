/**
 * High scores API using Reddit KV storage
 */
import { redis, context } from '@devvit/web/server';

export interface HighScoreEntry {
  username: string;
  score: number;
  timestamp: number;
  postId?: string;
}

export interface LeaderboardEntry extends HighScoreEntry {
  rank: number;
}

/**
 * Get user's high score
 */
export async function getUserHighScore(username: string): Promise<number> {
  try {
    const key = `highscore:user:${username}`;
    const score = await redis.get(key);
    return score ? parseInt(score) : 0;
  } catch (error) {
    console.error('Error getting user high score:', error);
    return 0;
  }
}

/**
 * Set user's high score if it's higher than current
 */
export async function setUserHighScore(username: string, score: number): Promise<boolean> {
  try {
    const key = `highscore:user:${username}`;
    const currentScore = await getUserHighScore(username);

    if (score > currentScore) {
      await redis.set(key, score.toString());

      // Also update the leaderboard
      await redis.zadd('leaderboard:global', { score, member: username });

      // Store metadata
      const metaKey = `highscore:meta:${username}`;
      await redis.hset(metaKey, {
        score: score.toString(),
        timestamp: Date.now().toString(),
        postId: context.postId || '',
        subreddit: context.subredditName || ''
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error setting user high score:', error);
    return false;
  }
}

/**
 * Get daily leaderboard
 */
export async function getDailyLeaderboard(date: string, limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const key = `leaderboard:daily:${date}`;
    const scores = await redis.zrange(key, 0, limit - 1, {
      reverse: true,
      withScores: true
    });

    if (!scores || scores.length === 0) {
      return [];
    }

    const entries: LeaderboardEntry[] = [];
    let rank = 1;

    for (let i = 0; i < scores.length; i += 2) {
      const username = scores[i] as string;
      const score = parseInt(scores[i + 1] as string);

      entries.push({
        rank,
        username,
        score,
        timestamp: Date.now(),
      });

      rank++;
    }

    return entries;
  } catch (error) {
    console.error('Error getting daily leaderboard:', error);
    return [];
  }
}

/**
 * Update daily leaderboard
 */
export async function updateDailyLeaderboard(username: string, score: number): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `leaderboard:daily:${today}`;

    await redis.zadd(key, { score, member: username });

    // Set expiry for daily leaderboard (7 days)
    await redis.expire(key, 7 * 24 * 60 * 60);
  } catch (error) {
    console.error('Error updating daily leaderboard:', error);
  }
}

/**
 * Get global leaderboard
 */
export async function getGlobalLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    // Get top scores from sorted set
    const scores = await redis.zrange('leaderboard:global', 0, limit - 1, {
      reverse: true,
      withScores: true
    });

    if (!scores || scores.length === 0) {
      return [];
    }

    // Transform to leaderboard entries
    const entries: LeaderboardEntry[] = [];
    let rank = 1;

    for (let i = 0; i < scores.length; i += 2) {
      const username = scores[i] as string;
      const score = parseInt(scores[i + 1] as string);

      // Get metadata
      const metaKey = `highscore:meta:${username}`;
      const metadata = await redis.hgetall(metaKey);

      entries.push({
        rank,
        username,
        score,
        timestamp: metadata?.timestamp ? parseInt(metadata.timestamp) : Date.now(),
        postId: metadata?.postId || undefined
      });

      rank++;
    }

    return entries;
  } catch (error) {
    console.error('Error getting global leaderboard:', error);
    return [];
  }
}

/**
 * Get subreddit-specific leaderboard
 */
export async function getSubredditLeaderboard(subreddit: string, limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const key = `leaderboard:subreddit:${subreddit}`;
    const scores = await redis.zrange(key, 0, limit - 1, {
      reverse: true,
      withScores: true
    });

    if (!scores || scores.length === 0) {
      return [];
    }

    const entries: LeaderboardEntry[] = [];
    let rank = 1;

    for (let i = 0; i < scores.length; i += 2) {
      const username = scores[i] as string;
      const score = parseInt(scores[i + 1] as string);

      const metaKey = `highscore:meta:${username}:${subreddit}`;
      const metadata = await redis.hgetall(metaKey);

      entries.push({
        rank,
        username,
        score,
        timestamp: metadata?.timestamp ? parseInt(metadata.timestamp) : Date.now(),
        postId: metadata?.postId || undefined
      });

      rank++;
    }

    return entries;
  } catch (error) {
    console.error('Error getting subreddit leaderboard:', error);
    return [];
  }
}

/**
 * Update subreddit leaderboard
 */
export async function updateSubredditLeaderboard(username: string, score: number, subreddit: string): Promise<void> {
  try {
    const key = `leaderboard:subreddit:${subreddit}`;
    await redis.zadd(key, { score, member: username });

    // Store subreddit-specific metadata
    const metaKey = `highscore:meta:${username}:${subreddit}`;
    await redis.hset(metaKey, {
      score: score.toString(),
      timestamp: Date.now().toString(),
      postId: context.postId || '',
      subreddit
    });
  } catch (error) {
    console.error('Error updating subreddit leaderboard:', error);
  }
}

/**
 * Get user's rank in global leaderboard
 */
export async function getUserRank(username: string): Promise<number | null> {
  try {
    const rank = await redis.zrevrank('leaderboard:global', username);
    return rank !== null ? rank + 1 : null; // Convert 0-based to 1-based
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
}

/**
 * Get statistics
 */
export async function getGameStatistics(): Promise<{
  totalPlayers: number;
  totalGames: number;
  averageScore: number;
  topScore: number;
}> {
  try {
    const totalPlayers = await redis.zcard('leaderboard:global') || 0;
    const totalGamesKey = 'stats:total_games';
    const totalGames = parseInt(await redis.get(totalGamesKey) || '0');

    // Get top score
    const topScores = await redis.zrange('leaderboard:global', 0, 0, {
      reverse: true,
      withScores: true
    });
    const topScore = topScores && topScores.length >= 2 ? parseInt(topScores[1] as string) : 0;

    // Calculate average (would need to track this separately for efficiency)
    const avgKey = 'stats:average_score';
    const averageScore = parseFloat(await redis.get(avgKey) || '0');

    return {
      totalPlayers,
      totalGames,
      averageScore,
      topScore
    };
  } catch (error) {
    console.error('Error getting game statistics:', error);
    return {
      totalPlayers: 0,
      totalGames: 0,
      averageScore: 0,
      topScore: 0
    };
  }
}

/**
 * Increment total games counter
 */
export async function incrementGamesPlayed(): Promise<void> {
  try {
    await redis.incr('stats:total_games');
  } catch (error) {
    console.error('Error incrementing games played:', error);
  }
}