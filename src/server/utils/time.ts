// Utilities for leaderboard time buckets aligned with Reddit best practices.
// Daily resets occur at 00:01 GMT and weekly resets at 00:01 GMT each Monday.

function adjustForDailyCutover(date: Date): Date {
  const clone = new Date(date.getTime());
  if (clone.getUTCHours() === 0 && clone.getUTCMinutes() < 1) {
    clone.setUTCMinutes(clone.getUTCMinutes() - 1);
  }
  return clone;
}

function adjustForWeeklyCutover(date: Date): Date {
  const clone = adjustForDailyCutover(date);
  if (clone.getUTCDay() === 1 && clone.getUTCHours() === 0 && clone.getUTCMinutes() < 1) {
    clone.setUTCMinutes(clone.getUTCMinutes() - 1);
  }
  return clone;
}

export function getDailyBucket(date: Date = new Date()): string {
  const adjusted = adjustForDailyCutover(date);
  const daily = new Date(Date.UTC(adjusted.getUTCFullYear(), adjusted.getUTCMonth(), adjusted.getUTCDate()));
  return daily.toISOString().slice(0, 10);
}

export function getDailyLeaderboardKey(date?: Date): string {
  return `leaderboard:daily:${getDailyBucket(date ?? new Date())}`;
}

export function getDailyFakeKey(date?: Date): string {
  return `${getDailyLeaderboardKey(date)}:fake`;
}

export function getWeeklyBucket(date: Date = new Date()): { year: number; week: number } {
  const adjusted = adjustForWeeklyCutover(date);
  const target = new Date(Date.UTC(adjusted.getUTCFullYear(), adjusted.getUTCMonth(), adjusted.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const diff = target.getTime() - yearStart.getTime();
  const week = Math.ceil((diff / (7 * 24 * 60 * 60 * 1000)) + 1e-8);
  return { year: target.getUTCFullYear(), week };
}

export function formatWeeklyBucket(bucket: { year: number; week: number }): string {
  return `${bucket.year}:${bucket.week.toString().padStart(2, '0')}`;
}

export function getWeeklyLeaderboardKey(date?: Date): string {
  const bucket = getWeeklyBucket(date ?? new Date());
  return `leaderboard:weekly:${formatWeeklyBucket(bucket)}`;
}

export function getWeeklyFakeKey(date?: Date): string {
  return `${getWeeklyLeaderboardKey(date)}:fake`;
}

