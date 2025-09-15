/**
 * Client-side high score service
 * Manages high scores using Reddit KV storage via API
 */

export interface HighScoreData {
  username: string;
  score: number;
  highScore: number;
  rank: number | null;
  updated: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  timestamp: number;
}

export interface GameStats {
  totalPlayers: number;
  totalGames: number;
  averageScore: number;
  topScore: number;
}

export class HighScoreService {
  private static instance: HighScoreService;
  private username: string | null = null;
  private cachedHighScore: number = 0;
  private lastSync: number = 0;
  private syncInterval: number = 60000; // Sync every minute

  static getInstance(): HighScoreService {
    if (!HighScoreService.instance) {
      HighScoreService.instance = new HighScoreService();
    }
    return HighScoreService.instance;
  }

  constructor() {
    this.initializeUsername();
    this.loadCachedScore();
  }

  /**
   * Initialize username from Reddit context or generate anonymous
   */
  private async initializeUsername(): Promise<void> {
    try {
      // Try to get Reddit username from context
      // In a real implementation, this would come from Reddit's auth
      const urlParams = new URLSearchParams(window.location.search);
      const redditUser = urlParams.get('username');

      if (redditUser) {
        this.username = redditUser;
      } else {
        // Generate anonymous username
        this.username = `player_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('hexomind_username', this.username);
      }
    } catch (error) {
      console.error('Error initializing username:', error);
      this.username = `player_${Date.now()}`;
    }
  }

  /**
   * Load cached high score from localStorage as fallback
   */
  private loadCachedScore(): void {
    try {
      const cached = localStorage.getItem('hexomind_highscore');
      if (cached) {
        const data = JSON.parse(cached);
        this.cachedHighScore = data.score || 0;
        this.lastSync = data.timestamp || 0;
      }
    } catch (error) {
      console.error('Error loading cached score:', error);
    }
  }

  /**
   * Save high score to cache
   */
  private saveCachedScore(score: number): void {
    try {
      localStorage.setItem('hexomind_highscore', JSON.stringify({
        score,
        timestamp: Date.now(),
        username: this.username
      }));
      this.cachedHighScore = score;
      this.lastSync = Date.now();
    } catch (error) {
      console.error('Error saving cached score:', error);
    }
  }

  /**
   * Get current username
   */
  getUsername(): string {
    return this.username || 'anonymous';
  }

  /**
   * Get user's high score
   */
  async getHighScore(): Promise<number> {
    // Return cached score if recent
    if (Date.now() - this.lastSync < this.syncInterval) {
      return this.cachedHighScore;
    }

    try {
      const response = await fetch(`/api/highscore/${this.getUsername()}`);
      if (response.ok) {
        const data = await response.json();
        this.cachedHighScore = data.score || 0;
        this.lastSync = Date.now();
        return this.cachedHighScore;
      }
    } catch (error) {
      console.error('Error fetching high score:', error);
    }

    return this.cachedHighScore;
  }

  /**
   * Submit a new score
   */
  async submitScore(score: number): Promise<HighScoreData> {
    const username = this.getUsername();

    try {
      const response = await fetch('/api/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, score }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update cache if new high score
        if (data.updated) {
          this.saveCachedScore(score);
        }

        return {
          username,
          score,
          highScore: data.highScore,
          rank: data.rank,
          updated: data.updated
        };
      }
    } catch (error) {
      console.error('Error submitting score:', error);
    }

    // Fallback to local storage
    const isHighScore = score > this.cachedHighScore;
    if (isHighScore) {
      this.saveCachedScore(score);
    }

    return {
      username,
      score,
      highScore: Math.max(score, this.cachedHighScore),
      rank: null,
      updated: isHighScore
    };
  }

  /**
   * Get global leaderboard
   */
  async getLeaderboard(type: 'global' | 'subreddit' = 'global', limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const response = await fetch(`/api/leaderboard?type=${type}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        return data.leaderboard || [];
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }

    return [];
  }

  /**
   * Get game statistics
   */
  async getStatistics(): Promise<GameStats> {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }

    return {
      totalPlayers: 0,
      totalGames: 0,
      averageScore: 0,
      topScore: this.cachedHighScore
    };
  }

  /**
   * Clear local cache (for testing)
   */
  clearCache(): void {
    localStorage.removeItem('hexomind_highscore');
    localStorage.removeItem('hexomind_username');
    this.cachedHighScore = 0;
    this.lastSync = 0;
    this.username = null;
    this.initializeUsername();
  }
}

export const highScoreService = HighScoreService.getInstance();