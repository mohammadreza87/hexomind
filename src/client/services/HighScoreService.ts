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
  private redditUsername: string | null = null;
  private customUsername: string | null = null;
  private cachedHighScore: number = 0;
  private lastSync: number = 0;
  private syncInterval: number = 60000; // Sync every minute
  private initializationPromise: Promise<void>;

  static getInstance(): HighScoreService {
    if (!HighScoreService.instance) {
      HighScoreService.instance = new HighScoreService();
    }
    return HighScoreService.instance;
  }

  constructor() {
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    this.loadCachedScore();
    await this.initializeUsername();
    this.loadCustomUsername();
  }

  /**
   * Initialize username from Reddit context or generate anonymous
   */
  private async initializeUsername(): Promise<void> {
    try {
      // First, try to get username from the server context
      const response = await fetch('/api/current-user');
      if (response.ok) {
        const data = await response.json();
        console.log('Current user data from server:', data);

        if (data.username) {
          this.redditUsername = data.username;
          this.username = this.redditUsername;
          console.log('Using Reddit username:', this.redditUsername);
        }
      }
    } catch (error) {
      console.error('Failed to get username from server:', error);
    }

    // Fallback: Try URL params
    if (!this.redditUsername) {
      const urlParams = new URLSearchParams(window.location.search);
      const redditUser = urlParams.get('username');

      if (redditUser) {
        this.redditUsername = redditUser;
        this.username = this.redditUsername;
      } else {
        // Check local storage for existing username
        const stored = localStorage.getItem('hexomind_username');
        if (stored) {
          this.username = stored;
        } else {
          // Generate anonymous username
          this.username = `player_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('hexomind_username', this.username);
        }
      }
    }

    console.log('Final username:', this.username);
  }

  /**
   * Load custom username from localStorage
   */
  private loadCustomUsername(): void {
    const stored = localStorage.getItem('hexomind_custom_username');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.username && data.timestamp) {
          // Check if custom username is still valid (not expired)
          const daysSinceSet = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
          if (daysSinceSet < 30) { // Custom username valid for 30 days
            this.customUsername = data.username;
            this.username = this.customUsername;
            console.log('Using custom username:', this.customUsername);
          } else {
            // Expired, clear it
            localStorage.removeItem('hexomind_custom_username');
          }
        }
      } catch (error) {
        console.error('Error loading custom username:', error);
      }
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

  async waitForInitialization(): Promise<void> {
    return this.initializationPromise;
  }

  /**
   * Get Reddit username
   */
  getRedditUsername(): string | null {
    return this.redditUsername;
  }

  /**
   * Check if user has custom username
   */
  hasCustomUsername(): boolean {
    return this.customUsername !== null;
  }

  /**
   * Set custom username
   */
  setCustomUsername(username: string): void {
    this.customUsername = username;
    this.username = username;

    // Save to localStorage
    localStorage.setItem('hexomind_custom_username', JSON.stringify({
      username: username,
      timestamp: Date.now()
    }));

    console.log('Custom username set:', username);
  }

  /**
   * Clear custom username (revert to Reddit username)
   */
  clearCustomUsername(): void {
    this.customUsername = null;
    this.username = this.redditUsername || `player_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.removeItem('hexomind_custom_username');
    console.log('Reverted to username:', this.username);
  }

  /**
   * Get user's high score
   */
  async getHighScore(): Promise<number> {
    await this.initializationPromise;

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
    await this.initializationPromise;
    const username = this.getUsername();

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, score }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Score submission timed out, saving locally');
      } else {
        console.error('Error submitting score:', error);
      }
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
    this.initializationPromise = this.initialize();
  }
}

export const highScoreService = HighScoreService.getInstance();