/**
 * High scores API using Reddit KV storage
 */
import { redis, context } from '@devvit/web/server';

import type { LeaderboardEntry } from '../../shared/types/leaderboard';
import {
  ensureFakeDailyLeaderboard,
  ensureFakeGlobalLeaderboard,
  ensureFakeWeeklyLeaderboard,
  getFakeMetadataKey
} from './dummyData';
import { logger } from '../utils/logger';
import {
  getDailyBucket,
  getDailyFakeKey,
  getDailyLeaderboardKey,
  getWeeklyBucket,
  getWeeklyFakeKey,
  getWeeklyLeaderboardKey,
  formatWeeklyBucket
} from '../utils/time';

export interface HighScoreEntry {
  username: string;
  score: number;
  timestamp: number;
  postId?: string;
}

const GLOBAL_REAL_KEY = 'leaderboard:global';
const DAILY_EXPIRY_SECONDS = 3 * 24 * 60 * 60;
const WEEKLY_EXPIRY_SECONDS = 6 * 24 * 60 * 60;

interface LeaderboardEntryWithSource extends LeaderboardEntry {
  isFake?: boolean;
}

function parseScore(value: unknown): number {
  if (typeof value === 'number') {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.max(0, Math.floor(parsed));
  }
  return 0;
}

async function fetchRealEntries(key: string, limit: number): Promise<LeaderboardEntryWithSource[]> {
  const upperBound = Math.max(limit - 1, 0);
  const raw = await redis.zRange(key, 0, upperBound);

  if (!raw || raw.length === 0) {
    return [];
  }

  const entries = normalizeZRangeResult(raw).reverse();
  const usernames = entries.map(item => item.member);
  const scores = entries.map(item => parseScore(item.score));

  const meta = await Promise.all(
    usernames.map(username => redis.hGetAll(`highscore:meta:${username}`))
  );

  return usernames.map((username, index) => {
    const metadata = meta[index];
    const timestamp = metadata?.timestamp ? Number(metadata.timestamp) : Date.now();
    const postId = metadata?.postId || undefined;

    return {
      rank: index + 1,
      username,
      score: scores[index],
      timestamp,
      postId,
      isFake: false
    } satisfies LeaderboardEntryWithSource;
  });
}

function parseFakeMetadata(raw: unknown): { timestamp?: number } {
  if (typeof raw !== 'string') {
    return {};
  }

  try {
    const data = JSON.parse(raw) as { timestamp?: number };
    if (typeof data.timestamp === 'number') {
      return { timestamp: data.timestamp };
    }
  } catch (error) {
    logger.warn('Failed to parse fake leaderboard metadata:', error);
  }
  return {};
}

function normalizeZRangeResult(raw: Array<{ member: string; score: number } | string>): Array<{ member: string; score: number }> {
  if (raw.length === 0) {
    return [];
  }

  const first = raw[0] as any;
  if (typeof first === 'object' && first !== null && 'member' in first && 'score' in first) {
    return raw as Array<{ member: string; score: number }>;
  }

  const normalized: Array<{ member: string; score: number }> = [];
  for (let i = 0; i < raw.length; i += 2) {
    const member = raw[i] as string;
    const score = parseScore(raw[i + 1]);
    normalized.push({ member, score });
  }
  return normalized;
}

async function fetchFakeEntries(
  key: string,
  metaKey: string,
  limit: number
): Promise<LeaderboardEntryWithSource[]> {
  const upperBound = Math.max(limit - 1, 0);
  const raw = await redis.zRange(key, 0, upperBound);

  if (!raw || raw.length === 0) {
    return [];
  }

  const metadata = await redis.hGetAll(metaKey);
  const descending = normalizeZRangeResult(raw).reverse();

  return descending.map((entry, index) => {
    const metaRecord = metadata?.[entry.member];
    const parsed = parseFakeMetadata(metaRecord);

    return {
      rank: index + 1,
      username: entry.member,
      score: parseScore(entry.score),
      timestamp: parsed.timestamp ?? Date.now(),
      isFake: true
    } satisfies LeaderboardEntryWithSource;
  });
}

function mergeEntries(
  realEntries: LeaderboardEntryWithSource[],
  fakeEntries: LeaderboardEntryWithSource[],
  limit: number
): LeaderboardEntryWithSource[] {
  const merged: LeaderboardEntryWithSource[] = [];
  let realIndex = 0;
  let fakeIndex = 0;

  while (merged.length < limit && (realIndex < realEntries.length || fakeIndex < fakeEntries.length)) {
    const real = realEntries[realIndex];
    const fake = fakeEntries[fakeIndex];

    if (!fake || (real && real.score >= fake.score)) {
      if (real) {
        merged.push({ ...real, isFake: false });
        realIndex++;
      } else if (fake) {
        merged.push({ ...fake, isFake: true });
        fakeIndex++;
      }
    } else {
      merged.push({ ...fake, isFake: true });
      fakeIndex++;
    }
  }

  merged.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return merged;
}

async function computeReverseRank(key: string, member: string): Promise<number | null> {
  const redisWithPossibleRank = redis as unknown as { zRevRank?: (key: string, member: string) => Promise<number | null> };
  if (typeof redisWithPossibleRank.zRevRank === 'function') {
    return redisWithPossibleRank.zRevRank(key, member);
  }

  const PAGE_SIZE = 200;
  let offset = 0;

  while (true) {
    const slice = await redis.zRange(key, offset, offset + PAGE_SIZE - 1, { reverse: true });
    if (!slice || slice.length === 0) {
      return null;
    }

    for (let index = 0; index < slice.length; index++) {
      if (slice[index] === member) {
        return offset + index;
      }
    }

    if (slice.length < PAGE_SIZE) {
      return null;
    }

    offset += PAGE_SIZE;
  }
}

async function appendUserEntryIfMissing(
  entries: LeaderboardEntryWithSource[],
  username: string,
  key: string
): Promise<LeaderboardEntryWithSource[]> {
  if (entries.some(entry => entry.username === username)) {
    return entries;
  }

  const score = await redis.zScore(key, username);
  if (score === undefined || score === null) {
    return entries;
  }

  const normalizedScore = parseScore(score);
  const rankIndex = await computeReverseRank(key, username);
  const metadata = await redis.hGetAll(`highscore:meta:${username}`);
  const timestamp = metadata?.timestamp ? Number(metadata.timestamp) : Date.now();
  const postId = metadata?.postId || undefined;

  entries.push({
    rank: rankIndex !== null ? rankIndex + 1 : entries.length + 1,
    username,
    score: normalizedScore,
    timestamp,
    postId,
    isFake: false
  });

  entries.sort((a, b) => a.rank - b.rank);
  return entries;
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
    const normalizedScore = Math.max(0, Math.floor(score));
    const key = `highscore:user:${username}`;
    const currentScore = await getUserHighScore(username);

    if (normalizedScore > currentScore) {
      await redis.set(key, normalizedScore.toString());

      // Also update the leaderboard
      await redis.zAdd(GLOBAL_REAL_KEY, { score: normalizedScore, member: username });

      // Store metadata
      const metaKey = `highscore:meta:${username}`;
      await redis.hSet(metaKey, {
        score: normalizedScore.toString(),
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

export async function resetUserHighScore(username: string): Promise<void> {
  try {
    const key = `highscore:user:${username}`;
    await redis.del(key);

    const metaKey = `highscore:meta:${username}`;
    await redis.del(metaKey);

    await redis.zRem(GLOBAL_REAL_KEY, [username]);

    const dailyKeys = await redis.keys('leaderboard:daily:*');
    const weeklyKeys = await redis.keys('leaderboard:weekly:*');
    const subredditKeys = await redis.keys('leaderboard:subreddit:*');

    const removals: Promise<unknown>[] = [];

    dailyKeys
      .filter(key => !key.endsWith(':fake'))
      .forEach(key => removals.push(redis.zRem(key, [username])));

    weeklyKeys
      .filter(key => !key.endsWith(':fake'))
      .forEach(key => removals.push(redis.zRem(key, [username])));

    subredditKeys.forEach(key => removals.push(redis.zRem(key, [username])));

    const subredditMetaKeys = await redis.keys(`highscore:meta:${username}:*`);
    subredditMetaKeys.forEach(key => removals.push(redis.del(key)));

    await Promise.all(removals);
  } catch (error) {
    console.error('Error resetting user high score:', error);
    throw error;
  }
}

/**
 * Get daily leaderboard
 */
export async function getDailyLeaderboard(date?: string, limit: number = 10, username?: string): Promise<LeaderboardEntry[]> {
  try {
    const bucket = date ?? getDailyBucket();
    await ensureFakeDailyLeaderboard(bucket);

    const realKey = `leaderboard:daily:${bucket}`;
    const fakeKey = `leaderboard:daily:${bucket}:fake`;
    const metaKey = getFakeMetadataKey('daily', bucket);

    const overscan = Math.max(limit * 2, limit + 5);

    const [realEntries, fakeEntries] = await Promise.all([
      fetchRealEntries(realKey, overscan),
      fetchFakeEntries(fakeKey, metaKey, overscan)
    ]);

    let leaderboard = mergeEntries(realEntries, fakeEntries, limit);

    if (username) {
      leaderboard = await appendUserEntryIfMissing(leaderboard, username, realKey);
    }

    return leaderboard;
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
    const key = getDailyLeaderboardKey();
    const normalizedScore = Math.max(0, Math.floor(score));

    const existingScore = await redis.zScore(key, username);
    const parsedScore = typeof existingScore === 'number'
      ? existingScore
      : existingScore !== null
        ? parseFloat(existingScore)
        : null;

    if (parsedScore === null || Number.isNaN(parsedScore) || normalizedScore > parsedScore) {
      await redis.zAdd(key, { score: normalizedScore, member: username });
    }

    // Keep a rolling window of daily leaderboards for a few days
    await redis.expire(key, DAILY_EXPIRY_SECONDS);
  } catch (error) {
    console.error('Error updating daily leaderboard:', error);
  }
}

/**
 * Get weekly leaderboard
 */
export async function getWeeklyLeaderboard(limit: number = 10, username?: string): Promise<LeaderboardEntry[]> {
  try {
    const now = new Date();
    const bucket = getWeeklyBucket(now);
    const bucketLabel = formatWeeklyBucket(bucket);
    await ensureFakeWeeklyLeaderboard(bucket);

    const key = getWeeklyLeaderboardKey(now);
    const fakeKey = getWeeklyFakeKey(now);
    const metaKey = getFakeMetadataKey('weekly', bucketLabel);

    const overscan = Math.max(limit * 2, limit + 10);

    const [realEntries, fakeEntries] = await Promise.all([
      fetchRealEntries(key, overscan),
      fetchFakeEntries(fakeKey, metaKey, overscan)
    ]);

    let leaderboard = mergeEntries(realEntries, fakeEntries, limit);

    if (username) {
      leaderboard = await appendUserEntryIfMissing(leaderboard, username, key);
    }

    return leaderboard;
  } catch (error) {
    console.error('Error getting weekly leaderboard:', error);
    return [];
  }
}

/**
 * Update weekly leaderboard
 */
export async function updateWeeklyLeaderboard(username: string, score: number): Promise<void> {
  try {
    const key = getWeeklyLeaderboardKey();
    const normalizedScore = Math.max(0, Math.floor(score));

    const existingScore = await redis.zScore(key, username);
    const parsedScore = typeof existingScore === 'number'
      ? existingScore
      : existingScore !== null
        ? parseFloat(existingScore)
        : null;

    if (parsedScore === null || Number.isNaN(parsedScore) || normalizedScore > parsedScore) {
      await redis.zAdd(key, { score: normalizedScore, member: username });
    }

    // Keep a rolling window of recent weekly leaderboards
    await redis.expire(key, WEEKLY_EXPIRY_SECONDS);
  } catch (error) {
    console.error('Error updating weekly leaderboard:', error);
  }
}

/**
 * Get global leaderboard
 */
export async function getGlobalLeaderboard(limit: number = 10, username?: string): Promise<LeaderboardEntry[]> {
  try {
    await ensureFakeGlobalLeaderboard();

    const fakeKey = 'leaderboard:global:fake';
    const metaKey = getFakeMetadataKey('global');
    const overscan = Math.max(limit * 2, 50);

    const [realEntries, fakeEntries] = await Promise.all([
      fetchRealEntries(GLOBAL_REAL_KEY, overscan),
      fetchFakeEntries(fakeKey, metaKey, overscan)
    ]);

    let leaderboard = mergeEntries(realEntries, fakeEntries, limit);

    if (username) {
      leaderboard = await appendUserEntryIfMissing(leaderboard, username, GLOBAL_REAL_KEY);
    }

    return leaderboard;
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
    const scores = await redis.zRange(key, 0, limit - 1, {
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
      const metadata = await redis.hGetAll(metaKey);

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
    await redis.zAdd(key, { score, member: username });

    // Store subreddit-specific metadata
    const metaKey = `highscore:meta:${username}:${subreddit}`;
    await redis.hSet(metaKey, {
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
    const rank = await computeReverseRank(GLOBAL_REAL_KEY, username);
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
    const totalPlayers = await redis.zCard(GLOBAL_REAL_KEY) || 0;
    const totalGamesKey = 'stats:total_games';
    const totalGames = parseInt(await redis.get(totalGamesKey) || '0');

    // Get top score
    const topScores = await redis.zRange(GLOBAL_REAL_KEY, 0, 0, {
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
    await redis.incrBy('stats:total_games', 1);
  } catch (error) {
    console.error('Error incrementing games played:', error);
  }
}
