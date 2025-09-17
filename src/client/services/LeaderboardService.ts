import type { LeaderboardEntry, LeaderboardPeriod, LeaderboardResponse } from '../../shared/types/leaderboard';

export type LeaderboardViewPeriod = Extract<LeaderboardPeriod, 'daily' | 'weekly' | 'global'>;

export interface LeaderboardViewEntry extends LeaderboardEntry {
  isCurrentUser: boolean;
}

type LeaderboardPayload = Partial<LeaderboardEntry> & {
  score?: number | string | null;
  rank?: number | string | null;
  username?: string | null;
  timestamp?: number | string | null;
  isFake?: boolean | null;
};

const FALLBACK_USERNAME_PREFIX = 'player';

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function coerceOptionalNumber(value: unknown): number | undefined {
  const coerced = coerceNumber(value, Number.NaN);
  return Number.isFinite(coerced) ? coerced : undefined;
}

function sanitizeUsername(value: unknown, index: number): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return `${FALLBACK_USERNAME_PREFIX}_${index + 1}`;
}

function sanitizePostId(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
}

export function normalizeLeaderboardPayload(
  entries: Array<LeaderboardPayload | null | undefined>,
  currentUsername: string,
): LeaderboardViewEntry[] {
  const deduped = new Map<string, LeaderboardViewEntry>();

  entries.forEach((raw, index) => {
    if (!raw) {
      return;
    }

    const username = sanitizeUsername(raw.username, index);
    const score = coerceNumber(raw.score, 0);
    const timestamp = coerceOptionalNumber(raw.timestamp) ?? Date.now();
    const postId = sanitizePostId(raw.postId);

    const existing = deduped.get(username);
    if (!existing || score > existing.score) {
      const provisionalRank = coerceNumber(raw.rank, index + 1);

      deduped.set(username, {
        rank: provisionalRank > 0 ? Math.floor(provisionalRank) : index + 1,
        username,
        score,
        timestamp,
        postId,
        isCurrentUser: username === currentUsername,
        isFake: raw.isFake === true
      });
    }
  });

  const normalized = Array.from(deduped.values());
  normalized.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.username.localeCompare(b.username);
  });

  normalized.forEach((entry, index) => {
    if (!Number.isFinite(entry.rank) || entry.rank <= 0) {
      entry.rank = index + 1;
    }
    entry.isCurrentUser = entry.username === currentUsername;
  });

  return normalized;
}

class LeaderboardService {
  private cache = new Map<LeaderboardViewPeriod, LeaderboardViewEntry[]>();

  getCached(period: LeaderboardViewPeriod): LeaderboardViewEntry[] | null {
    return this.cache.get(period) ?? null;
  }

  async fetchLeaderboard(
    period: LeaderboardViewPeriod,
    limit: number,
    currentUsername: string,
  ): Promise<LeaderboardViewEntry[]> {
    const cached = this.cache.get(period);
    if (cached && cached.length > 0) {
      return cached.map(entry => ({ ...entry, isCurrentUser: entry.username === currentUsername }));
    }

    const params = new URLSearchParams({ type: period, limit: String(limit) });
    if (currentUsername) {
      params.set('username', currentUsername);
    }

    const response = await fetch(`/api/leaderboard?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard (${response.status})`);
    }

    const data = (await response.json()) as Partial<LeaderboardResponse> | null;
    const normalized = normalizeLeaderboardPayload(
      Array.isArray(data?.leaderboard) ? data?.leaderboard : [],
      currentUsername,
    );

    this.cache.set(period, normalized);
    return normalized;
  }

  primeCache(period: LeaderboardViewPeriod, entries: LeaderboardViewEntry[]): void {
    this.cache.set(period, entries);
  }
}

export const leaderboardService = new LeaderboardService();
