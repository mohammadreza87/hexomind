/**
 * Generate dummy leaderboard data for better UX
 */
import { redis } from '@devvit/web/server';

type DevvitGlobal = typeof globalThis & {
  devvit?: {
    metadataProvider?: () => unknown;
  };
};

function hasRedisContext(): boolean {
  const devvitGlobal = globalThis as DevvitGlobal;
  const metadataProvider = devvitGlobal.devvit?.metadataProvider;

  if (typeof metadataProvider !== 'function') {
    return false;
  }

  try {
    return metadataProvider() !== undefined;
  } catch {
    return false;
  }
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
  'Hunter', 'Slayer', 'Crusher', 'Destroyer', 'Builder', 'Creator', 'Gamer',
  '2025', '2024', 'XD', 'Pro', 'Max', 'Plus', 'Ultra', 'Prime', 'Alpha',
  'Beta', 'Omega', 'Zero', 'One', 'X', 'Z', '_YT', '_TTV', 'Gaming'
];

/**
 * Generate a random username
 */
function generateUsername(): string {
  const prefix = USERNAME_PREFIXES[Math.floor(Math.random() * USERNAME_PREFIXES.length)];
  const suffix = USERNAME_SUFFIXES[Math.floor(Math.random() * USERNAME_SUFFIXES.length)];
  const number = Math.random() > 0.5 ? Math.floor(Math.random() * 999) : '';
  return `${prefix}${suffix}${number}`;
}

/**
 * Generate a realistic score based on rank
 */
function generateScore(rank: number, maxScore: number = 50000): number {
  // Use exponential decay for more realistic distribution
  // Top players have high scores, drops off quickly
  const factor = Math.exp(-rank / 10);
  const baseScore = Math.floor(maxScore * factor);

  // Add some randomness
  const variance = Math.floor(baseScore * 0.2);
  const randomOffset = Math.floor(Math.random() * variance) - variance / 2;

  return Math.max(100, baseScore + randomOffset);
}

/**
 * Populate all-time leaderboard with dummy data
 */
export async function populateAllTimeLeaderboard(count: number = 100): Promise<void> {
  try {
    console.log(`Populating all-time leaderboard with ${count} dummy entries...`);

    const leaderboardKey = 'leaderboard:global';
    const usedUsernames = new Set<string>();

    for (let i = 0; i < count; i++) {
      let username = generateUsername();

      // Ensure unique usernames
      while (usedUsernames.has(username)) {
        username = generateUsername();
      }
      usedUsernames.add(username);

      const score = generateScore(i, 50000);

      // Add to global leaderboard
      await redis.zAdd(leaderboardKey, { score, member: username });

      // Add metadata
      const metaKey = `highscore:meta:${username}`;
      await redis.hSet(metaKey, {
        score: score.toString(),
        timestamp: (Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toString(), // Random time in last 30 days
        postId: 'dummy',
        subreddit: 'hexomind'
      });

      // Also set user high score
      await redis.set(`highscore:user:${username}`, score.toString());
    }

    console.log('All-time leaderboard populated successfully');
  } catch (error) {
    console.error('Error populating all-time leaderboard:', error);
  }
}

/**
 * Populate daily leaderboard with dummy data
 */
export async function populateDailyLeaderboard(count: number = 15): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const leaderboardKey = `leaderboard:daily:${today}`;

    console.log(`Populating daily leaderboard for ${today} with ${count} dummy entries...`);

    const usedUsernames = new Set<string>();

    for (let i = 0; i < count; i++) {
      let username = generateUsername();

      // Ensure unique usernames
      while (usedUsernames.has(username)) {
        username = generateUsername();
      }
      usedUsernames.add(username);

      // Daily scores are typically lower than all-time
      const score = generateScore(i, 30000);

      // Add to daily leaderboard
      await redis.zAdd(leaderboardKey, { score, member: username });
    }

    // Set expiry for daily leaderboard (7 days)
    await redis.expire(leaderboardKey, 7 * 24 * 60 * 60);

    console.log('Daily leaderboard populated successfully');
  } catch (error) {
    console.error('Error populating daily leaderboard:', error);
  }
}

/**
 * Populate weekly leaderboard with dummy data
 */
export async function populateWeeklyLeaderboard(count: number = 35): Promise<void> {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const week = Math.floor(diff / oneWeek) + 1;
    const year = now.getFullYear();

    const leaderboardKey = `leaderboard:weekly:${year}:${week}`;

    console.log(`Populating weekly leaderboard for week ${week} of ${year} with ${count} dummy entries...`);

    const usedUsernames = new Set<string>();

    for (let i = 0; i < count; i++) {
      let username = generateUsername();

      // Ensure unique usernames
      while (usedUsernames.has(username)) {
        username = generateUsername();
      }
      usedUsernames.add(username);

      // Weekly scores between daily and all-time
      const score = generateScore(i, 40000);

      // Add to weekly leaderboard
      await redis.zAdd(leaderboardKey, { score, member: username });
    }

    // Set expiry for weekly leaderboard (30 days)
    await redis.expire(leaderboardKey, 30 * 24 * 60 * 60);

    console.log('Weekly leaderboard populated successfully');
  } catch (error) {
    console.error('Error populating weekly leaderboard:', error);
  }
}

/**
 * Initialize all leaderboards with dummy data
 */
export async function initializeLeaderboards(): Promise<void> {
  try {
    if (!hasRedisContext()) {
      console.warn('Skipping leaderboard initialization: Devvit context is not available.');
      return;
    }

    console.log('Initializing leaderboards with dummy data...');

    // Check if we already have data
    const globalCount = await redis.zCard('leaderboard:global');

    if (globalCount < 50) {
      // Populate with different amounts for variety
      await populateAllTimeLeaderboard(Math.floor(Math.random() * 40) + 80); // 80-120
      await populateDailyLeaderboard(Math.floor(Math.random() * 10) + 10); // 10-20
      await populateWeeklyLeaderboard(Math.floor(Math.random() * 25) + 25); // 25-50

      console.log('All leaderboards initialized successfully');
    } else {
      console.log('Leaderboards already have data, skipping initialization');

      // Still populate daily and weekly if needed
      const today = new Date().toISOString().split('T')[0];
      const dailyCount = await redis.zCard(`leaderboard:daily:${today}`);

      if (dailyCount < 10) {
        await populateDailyLeaderboard(Math.floor(Math.random() * 10) + 10);
      }

      // Check weekly
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const diff = now.getTime() - start.getTime();
      const oneWeek = 1000 * 60 * 60 * 24 * 7;
      const week = Math.floor(diff / oneWeek) + 1;
      const year = now.getFullYear();
      const weeklyCount = await redis.zCard(`leaderboard:weekly:${year}:${week}`);

      if (weeklyCount < 25) {
        await populateWeeklyLeaderboard(Math.floor(Math.random() * 25) + 25);
      }
    }
  } catch (error) {
    console.error('Error initializing leaderboards:', error);
  }
}

/**
 * Ensure player appears in leaderboard
 */
export async function ensurePlayerInLeaderboard(username: string, score: number): Promise<void> {
  try {
    const applyIfHigher = async (key: string, expirySeconds?: number): Promise<void> => {
      const existingScore = await redis.zScore(key, username);
      const parsedScore = typeof existingScore === 'number'
        ? existingScore
        : existingScore !== null
          ? parseFloat(existingScore)
          : null;

      if (parsedScore === null || Number.isNaN(parsedScore) || score > parsedScore) {
        await redis.zAdd(key, { score, member: username });
      }

      if (expirySeconds) {
        await redis.expire(key, expirySeconds);
      }
    };

    await applyIfHigher('leaderboard:global');

    const today = new Date().toISOString().split('T')[0];
    await applyIfHigher(`leaderboard:daily:${today}`, 7 * 24 * 60 * 60);

    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const week = Math.floor(diff / oneWeek) + 1;
    const year = now.getFullYear();
    await applyIfHigher(`leaderboard:weekly:${year}:${week}`, 30 * 24 * 60 * 60);

    console.log(`Ensured ${username} appears in all leaderboards with score ${score}`);
  } catch (error) {
    console.error('Error ensuring player in leaderboard:', error);
  }
}