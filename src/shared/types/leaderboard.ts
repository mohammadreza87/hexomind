export type LeaderboardPeriod = 'daily' | 'weekly' | 'global' | 'subreddit';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  timestamp?: number;
  postId?: string;
  isFake?: boolean;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  type: LeaderboardPeriod;
}
