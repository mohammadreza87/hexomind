import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@devvit/web/server', () => {
  const stringStore = new Map<string, string>();
  const hashStore = new Map<string, Record<string, string>>();
  const sortedSets = new Map<string, Map<string, number>>();
  const expiryStore = new Map<string, number>();

  const ensureSortedSet = (key: string): Map<string, number> => {
    let set = sortedSets.get(key);
    if (!set) {
      set = new Map();
      sortedSets.set(key, set);
    }
    return set;
  };

  const getSortedEntries = (key: string): Array<[string, number]> => {
    const set = sortedSets.get(key);
    return set ? Array.from(set.entries()) : [];
  };

  const redis = {
    async get(key: string): Promise<string | null> {
      return stringStore.has(key) ? stringStore.get(key)! : null;
    },
    async set(key: string, value: string): Promise<'OK'> {
      stringStore.set(key, value);
      return 'OK';
    },
    async incrBy(key: string, increment: number): Promise<number> {
      const current = parseInt(stringStore.get(key) ?? '0', 10);
      const next = current + increment;
      stringStore.set(key, next.toString());
      return next;
    },
    async zadd(key: string, entry: { score: number; member: string }): Promise<number> {
      const set = ensureSortedSet(key);
      set.set(entry.member, entry.score);
      return 1;
    },
    async zrange(
      key: string,
      start: number,
      stop: number,
      options?: { reverse?: boolean; withScores?: boolean }
    ): Promise<string[]> {
      const entries = getSortedEntries(key).sort((a, b) => a[1] - b[1]);
      const ordered = options?.reverse ? entries.slice().reverse() : entries;
      const sliced = ordered.slice(start, stop + 1);
      const result: string[] = [];
      for (const [member, value] of sliced) {
        result.push(member);
        if (options?.withScores) {
          result.push(value.toString());
        }
      }
      return result;
    },
    async zScore(key: string, member: string): Promise<number | null> {
      const set = sortedSets.get(key);
      if (!set) {
        return null;
      }
      const value = set.get(member);
      return value === undefined ? null : value;
    },
    async expire(key: string, seconds: number): Promise<number> {
      expiryStore.set(key, seconds);
      return 1;
    },
    async zcard(key: string): Promise<number> {
      return sortedSets.get(key)?.size ?? 0;
    },
    async zrevrank(key: string, member: string): Promise<number | null> {
      const entries = getSortedEntries(key).sort((a, b) => b[1] - a[1]);
      const index = entries.findIndex(([name]) => name === member);
      return index === -1 ? null : index;
    },
    async hset(key: string, values: Record<string, string>): Promise<number> {
      const current = hashStore.get(key) ?? {};
      hashStore.set(key, { ...current, ...values });
      return 1;
    },
    async hSet(key: string, values: Record<string, string>): Promise<number> {
      return redis.hset(key, values);
    },
    async hgetall(key: string): Promise<Record<string, string>> {
      const current = hashStore.get(key);
      return current ? { ...current } : {};
    },
    async hGet(key: string, field: string): Promise<string | null> {
      const current = hashStore.get(key);
      return current?.[field] ?? null;
    }
  };

  const context = {
    postId: 'test-post',
    subredditName: undefined as string | undefined,
    username: 'tester',
    userId: 'tester'
  };

  return {
    redis,
    context,
    __redisMock: {
      reset(): void {
        stringStore.clear();
        hashStore.clear();
        sortedSets.clear();
        expiryStore.clear();
      }
    }
  };
});

import {
  getDailyLeaderboard,
  getGlobalLeaderboard,
  getUserHighScore,
  getWeeklyLeaderboard,
  setUserHighScore,
  updateDailyLeaderboard,
  updateWeeklyLeaderboard
} from '../src/server/api/highscores';
import { ensurePlayerInLeaderboard } from '../src/server/api/dummyData';
import { __redisMock, context } from '@devvit/web/server';

const getToday = (): string => new Date().toISOString().split('T')[0];

async function submitScore(username: string, score: number): Promise<{
  updated: boolean;
  authoritativeScore: number;
}> {
  const updated = await setUserHighScore(username, score);
  const authoritativeScore = updated ? score : await getUserHighScore(username);

  await ensurePlayerInLeaderboard(username, authoritativeScore);
  await updateDailyLeaderboard(username, authoritativeScore);
  await updateWeeklyLeaderboard(username, authoritativeScore);

  return { updated, authoritativeScore };
}

describe('Highscore endpoint flow', () => {
  beforeEach(() => {
    __redisMock.reset();
    context.postId = 'test-post';
    context.subredditName = undefined;
    context.username = 'tester';
    context.userId = 'tester';
  });

  it('maintains leaderboard scores when lower score is submitted', async () => {
    const username = 'player1';
    const initialScore = 1500;

    await submitScore(username, initialScore);

    const today = getToday();

    const [globalBefore] = await getGlobalLeaderboard(1);
    const [dailyBefore] = await getDailyLeaderboard(today, 1);
    const [weeklyBefore] = await getWeeklyLeaderboard(1);

    expect(globalBefore?.score).toBe(initialScore);
    expect(dailyBefore?.score).toBe(initialScore);
    expect(weeklyBefore?.score).toBe(initialScore);

    const lowerScore = 900;
    const submission = await submitScore(username, lowerScore);

    expect(submission.updated).toBe(false);
    expect(submission.authoritativeScore).toBe(initialScore);

    const [globalAfter] = await getGlobalLeaderboard(1);
    const [dailyAfter] = await getDailyLeaderboard(today, 1);
    const [weeklyAfter] = await getWeeklyLeaderboard(1);

    expect(globalAfter?.score).toBe(initialScore);
    expect(dailyAfter?.score).toBe(initialScore);
    expect(weeklyAfter?.score).toBe(initialScore);
  });

  it('guards leaderboard helpers against score downgrades', async () => {
    const username = 'player2';
    const bestScore = 2000;

    await submitScore(username, bestScore);

    const today = getToday();

    await ensurePlayerInLeaderboard(username, 500);
    await updateDailyLeaderboard(username, 500);
    await updateWeeklyLeaderboard(username, 500);

    const [globalEntry] = await getGlobalLeaderboard(1);
    const [dailyEntry] = await getDailyLeaderboard(today, 1);
    const [weeklyEntry] = await getWeeklyLeaderboard(1);
    const storedHighScore = await getUserHighScore(username);

    expect(globalEntry?.score).toBe(bestScore);
    expect(dailyEntry?.score).toBe(bestScore);
    expect(weeklyEntry?.score).toBe(bestScore);
    expect(storedHighScore).toBe(bestScore);
  });
});
