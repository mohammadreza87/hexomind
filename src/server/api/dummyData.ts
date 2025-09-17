/**
 * Generate dummy leaderboard data for better UX
 */
import { redis } from '@devvit/web/server';

import {
  getDailyBucket,
  getDailyFakeKey,
  getDailyLeaderboardKey,
  getWeeklyBucket,
  getWeeklyFakeKey,
  getWeeklyLeaderboardKey,
  formatWeeklyBucket,
} from '../utils/time';

const GLOBAL_FAKE_KEY = 'leaderboard:global:fake';
const FAKE_META_PREFIX = 'leaderboard:fake:meta';

const GLOBAL_FAKE_RANGE = { min: 100, max: 120 };
const DAILY_FAKE_RANGE = { min: 5, max: 15 };
const WEEKLY_FAKE_RANGE = { min: 25, max: 35 };

const DAILY_TTL_SECONDS = 3 * 24 * 60 * 60; // keep a few snapshots for analytics
const WEEKLY_TTL_SECONDS = 6 * 24 * 60 * 60;

type DevvitGlobal = typeof globalThis & {
  devvit?: {
    metadataProvider?: () => unknown;
  };
};

function isFunction<T extends (...args: unknown[]) => unknown>(value: unknown): value is T {
  return typeof value === 'function';
}

let redisAvailability: boolean | null = null;

async function ensureRedisAvailable(): Promise<boolean> {
  if (redisAvailability !== null) {
    return redisAvailability;
  }

  const devvitGlobal = globalThis as DevvitGlobal;
  const metadataProvider = devvitGlobal.devvit?.metadataProvider;

  if (isFunction(metadataProvider)) {
    try {
      if (metadataProvider() !== undefined) {
        redisAvailability = true;
        return true;
      }
    } catch (error) {
      console.warn('Devvit metadata provider check failed:', error);
    }
  }

  redisAvailability = true;
  return true;
}

// Realistic Reddit-style usernames
const USERNAME_PREFIXES = [
  'Hex', 'Pixel', 'Neon', 'Cyber', 'Retro', 'Arcade', 'Gamer', 'Pro',
  'Elite', 'Master', 'Shadow', 'Ghost', 'Ninja', 'Dragon', 'Phoenix',
  'Thunder', 'Storm', 'Blaze', 'Frost', 'Crystal', 'Quantum', 'Nebula',
  'Cosmic', 'Star', 'Moon', 'Solar', 'Nova', 'Vortex', 'Pulse', 'Wave'
];

const USERNAME_SUFFIXES = [
  'Master', 'King', 'Queen', 'Lord', 'Lady', 'Knight', 'Wizard', 'Mage',
  'Hunter', 'Slayer', 'Crusher', 'Builder', 'Creator', 'Gamer',
  '2025', '2024', 'XD', 'Pro', 'Max', 'Plus', 'Ultra', 'Prime', 'Alpha',
  'Beta', 'Omega', 'Zero', 'One', 'X', 'Z', '_YT', '_TTV', 'Gaming'
];

const USERNAME_JOINERS = ['', '_', '-', ''];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getFakeMetaKey(scope: 'global' | 'daily' | 'weekly', bucket?: string): string {
  if (scope === 'global') {
    return `${FAKE_META_PREFIX}:global`;
  }
  if (!bucket) {
    throw new Error(`bucket is required for scope ${scope}`);
  }
  return `${FAKE_META_PREFIX}:${scope}:${bucket}`;
}

/**
 * Generate a random username that feels like a Reddit handle
 */
function generateUsername(): string {
  const prefix = USERNAME_PREFIXES[Math.floor(Math.random() * USERNAME_PREFIXES.length)];
  const suffix = USERNAME_SUFFIXES[Math.floor(Math.random() * USERNAME_SUFFIXES.length)];
  const joiner = USERNAME_JOINERS[Math.floor(Math.random() * USERNAME_JOINERS.length)];
  const number = Math.random() > 0.6 ? randomInt(1, 9999).toString().padStart(randomInt(2, 4), '0') : '';
  return `${prefix}${joiner}${suffix}${number}`;
}

/**
 * Generate a realistic score based on rank
 */
function generateScore(rank: number, maxScore: number = 50000): number {
  const factor = Math.exp(-rank / 12);
  const baseScore = Math.floor(maxScore * factor);
  const variance = Math.floor(baseScore * 0.25);
  const randomOffset = Math.floor(Math.random() * variance) - variance / 2;
  return Math.max(120, baseScore + randomOffset);
}

async function writeFakeEntry(
  key: string,
  metaKey: string,
  username: string,
  score: number,
  metadata: { timestamp: number; bucket: string; scope: 'global' | 'daily' | 'weekly' }
): Promise<void> {
  await redis.zAdd(key, { score, member: username });
  await redis.hSet(metaKey, {
    [username]: JSON.stringify(metadata)
  });
}

async function generateUniqueUsername(exclusions: Set<string>): Promise<string> {
  let username = generateUsername();
  while (exclusions.has(username)) {
    username = generateUsername();
  }
  exclusions.add(username);
  return username;
}

/**
 * Populate all-time leaderboard with dummy data (fake bucket)
 */
export async function populateAllTimeLeaderboard(count: number = GLOBAL_FAKE_RANGE.min): Promise<void> {
  if (!(await ensureRedisAvailable())) {
    return;
  }

  const usedUsernames = new Set<string>();
  await redis.del(GLOBAL_FAKE_KEY);
  const metaKey = getFakeMetaKey('global');
  await redis.del(metaKey);

  for (let i = 0; i < count; i++) {
    const username = await generateUniqueUsername(usedUsernames);
    const score = generateScore(i, 50000);
    const timestamp = Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000 - randomInt(0, 12) * 60 * 60 * 1000;
    await writeFakeEntry(GLOBAL_FAKE_KEY, metaKey, username, score, {
      timestamp,
      bucket: 'global',
      scope: 'global'
    });
  }
}

/**
 * Populate daily leaderboard with dummy data for the supplied bucket (00:01 GMT cutover)
 */
export async function populateDailyLeaderboard(count: number = DAILY_FAKE_RANGE.min, bucket?: string): Promise<void> {
  if (!(await ensureRedisAvailable())) {
    return;
  }
  const activeBucket = bucket ?? getDailyBucket();
  const key = `leaderboard:daily:${activeBucket}:fake`;
  const metaKey = getFakeMetaKey('daily', activeBucket);

  await redis.del(key);
  await redis.del(metaKey);

  const usedUsernames = new Set<string>();
  for (let i = 0; i < count; i++) {
    const username = await generateUniqueUsername(usedUsernames);
    const score = generateScore(i, 32000);
    const timestamp = Date.now() - randomInt(0, 18) * 60 * 60 * 1000;
    await writeFakeEntry(key, metaKey, username, score, {
      timestamp,
      bucket: activeBucket,
      scope: 'daily'
    });
  }

  await redis.expire(key, DAILY_TTL_SECONDS);
  await redis.expire(metaKey, DAILY_TTL_SECONDS);
}

/**
 * Populate weekly leaderboard with dummy data for the supplied ISO week bucket
 */
export async function populateWeeklyLeaderboard(count: number = WEEKLY_FAKE_RANGE.min, bucket?: { year: number; week: number }): Promise<void> {
  if (!(await ensureRedisAvailable())) {
    return;
  }
  const activeBucket = bucket ?? getWeeklyBucket();
  const bucketLabel = formatWeeklyBucket(activeBucket);
  const key = `leaderboard:weekly:${bucketLabel}:fake`;
  const metaKey = getFakeMetaKey('weekly', bucketLabel);

  await redis.del(key);
  await redis.del(metaKey);

  const usedUsernames = new Set<string>();
  for (let i = 0; i < count; i++) {
    const username = await generateUniqueUsername(usedUsernames);
    const score = generateScore(i, 42000);
    const timestamp = Date.now() - randomInt(1, 7) * 24 * 60 * 60 * 1000;
    await writeFakeEntry(key, metaKey, username, score, {
      timestamp,
      bucket: bucketLabel,
      scope: 'weekly'
    });
  }

  await redis.expire(key, WEEKLY_TTL_SECONDS);
  await redis.expire(metaKey, WEEKLY_TTL_SECONDS);
}

function withinRange(current: number, range: { min: number; max: number }): boolean {
  return current >= range.min && current <= range.max;
}

function targetWithinRange(range: { min: number; max: number }): number {
  return randomInt(range.min, range.max);
}

export async function ensureFakeGlobalLeaderboard(): Promise<void> {
  if (!(await ensureRedisAvailable())) {
    return;
  }
  const count = await redis.zCard(GLOBAL_FAKE_KEY) ?? 0;
  if (withinRange(count, GLOBAL_FAKE_RANGE)) {
    return;
  }
  await populateAllTimeLeaderboard(targetWithinRange(GLOBAL_FAKE_RANGE));
}

export async function ensureFakeDailyLeaderboard(bucket?: string): Promise<void> {
  if (!(await ensureRedisAvailable())) {
    return;
  }
  const activeBucket = bucket ?? getDailyBucket();
  const key = `leaderboard:daily:${activeBucket}:fake`;
  const count = await redis.zCard(key) ?? 0;
  if (withinRange(count, DAILY_FAKE_RANGE)) {
    return;
  }
  await populateDailyLeaderboard(targetWithinRange(DAILY_FAKE_RANGE), activeBucket);
}

export async function ensureFakeWeeklyLeaderboard(bucket?: { year: number; week: number } | string): Promise<void> {
  if (!(await ensureRedisAvailable())) {
    return;
  }
  const activeBucket = typeof bucket === 'string' ? (() => {
    const [yearPart, weekPart] = bucket.split(':');
    return { year: Number(yearPart), week: Number(weekPart) };
  })() : bucket ?? getWeeklyBucket();
  const bucketLabel = formatWeeklyBucket(activeBucket);
  const key = `leaderboard:weekly:${bucketLabel}:fake`;
  const count = await redis.zCard(key) ?? 0;
  if (withinRange(count, WEEKLY_FAKE_RANGE)) {
    return;
  }
  await populateWeeklyLeaderboard(targetWithinRange(WEEKLY_FAKE_RANGE), activeBucket);
}

/**
 * Initialize all leaderboards with dummy data
 */
export async function initializeLeaderboards(): Promise<void> {
  try {
    await ensureFakeGlobalLeaderboard();
    await ensureFakeDailyLeaderboard();
    await ensureFakeWeeklyLeaderboard();
  } catch (error) {
    console.error('Error initializing leaderboards:', error);
  }
}

/**
 * Ensure player appears in leaderboard
 */
export async function ensurePlayerInLeaderboard(username: string, score: number): Promise<void> {
  try {
    if (!(await ensureRedisAvailable())) {
      console.warn('Skipping leaderboard update: Redis context is not available.');
      return;
    }

    const normalizedScore = Math.max(0, Math.floor(score));

    const applyIfHigher = async (key: string, expirySeconds?: number): Promise<void> => {
      const existingScore = await redis.zScore(key, username);
      const parsedScore = typeof existingScore === 'number'
        ? existingScore
        : existingScore !== null
          ? parseFloat(existingScore)
          : null;

      if (parsedScore === null || Number.isNaN(parsedScore) || normalizedScore > parsedScore) {
        await redis.zAdd(key, { score: normalizedScore, member: username });
      }

      if (expirySeconds) {
        await redis.expire(key, expirySeconds);
      }
    };

    await applyIfHigher('leaderboard:global');

    const dailyKey = getDailyLeaderboardKey();
    await applyIfHigher(dailyKey, DAILY_TTL_SECONDS);

    const weeklyKey = getWeeklyLeaderboardKey();
    await applyIfHigher(weeklyKey, WEEKLY_TTL_SECONDS);

    console.log(`Ensured ${username} appears in leaderboards with score ${score}`);
  } catch (error) {
    console.error('Error ensuring player in leaderboard:', error);
  }
}

export function getFakeMetadataKey(scope: 'global' | 'daily' | 'weekly', bucket?: string): string {
  return getFakeMetaKey(scope, bucket);
}
