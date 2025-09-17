import type { LeaderboardEntry } from '../../shared/types/leaderboard';

type LeaderboardEntryInput = Partial<LeaderboardEntry> & {
  score?: number | string | null;
  rank?: number | string | null;
  username?: string | null;
  timestamp?: number | string | null;
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

/**
 * Normalize raw leaderboard entries returned from Redis/Devvit APIs into a safe, predictable shape.
 *
 * The Devvit leaderboard best practices recommend:
 * - Always sending numeric scores in descending order.
 * - Guaranteeing ranks are sequential and 1-based.
 * - Ensuring usernames are present to avoid client-side rendering issues.
 */
export function normalizeLeaderboardEntries(
  entries: Array<LeaderboardEntryInput | null | undefined>,
): LeaderboardEntry[] {
  const deduped = new Map<string, LeaderboardEntry>();

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
    entry.rank = index + 1;
  });

  return normalized;
}
