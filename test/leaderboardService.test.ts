import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  leaderboardService,
  normalizeLeaderboardPayload,
  type LeaderboardViewEntry,
} from '../src/client/services/LeaderboardService';

const now = Date.now();

describe('normalizeLeaderboardPayload', () => {

  it('coerces invalid scores and usernames to safe defaults', () => {
    const result = normalizeLeaderboardPayload(
      [
        {
          rank: null,
          username: '',
          score: null,
          timestamp: 'not-a-number',
        },
        undefined,
        {
          rank: '3',
          username: '  validUser  ',
          score: '4200',
          timestamp: now.toString(),
        },
      ],
      'validUser',
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      rank: 1,
      username: 'validUser',
      score: 4200,
      isCurrentUser: true,
    });

    expect(result[1].username.startsWith('player_')).toBe(true);
    expect(result[1].score).toBe(0);
    expect(result[1].rank).toBe(2);
  });

  it('deduplicates usernames keeping the highest score', () => {
    const result = normalizeLeaderboardPayload(
      [
        { rank: 1, username: 'userA', score: 1000 },
        { rank: 2, username: 'userA', score: 2000 },
        { rank: 3, username: 'userB', score: 500 },
      ],
      'userB',
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ username: 'userA', score: 2000, rank: 1 });
    expect(result[1]).toMatchObject({ username: 'userB', score: 500, rank: 2, isCurrentUser: true });
  });
});

describe('leaderboardService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    leaderboardService.primeCache('daily', []);
    leaderboardService.primeCache('weekly', []);
    leaderboardService.primeCache('global', []);
  });

  it('returns cached entries without calling fetch', async () => {
    const cachedEntry: LeaderboardViewEntry = {
      rank: 1,
      username: 'cachedPlayer',
      score: 1234,
      isCurrentUser: false,
      timestamp: now,
    };

    leaderboardService.primeCache('daily', [cachedEntry]);

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await leaderboardService.fetchLeaderboard('daily', 10, 'anotherPlayer');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      username: 'cachedPlayer',
      rank: 1,
      score: 1234,
      isCurrentUser: false,
    });

    fetchSpy.mockRestore();
  });
});
