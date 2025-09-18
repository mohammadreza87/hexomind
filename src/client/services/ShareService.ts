import type { ShareStatus } from '../ui/store/gameStore';
import { logger } from '../utils/logger';

interface ShareStatusResponse extends ShareStatus {}

class ShareService {
  private cache = new Map<string, { status: ShareStatusResponse; fetchedAt: number }>();

  async getStatus(username: string, options: { force?: boolean } = {}): Promise<ShareStatusResponse> {
    const cacheKey = username.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && !options.force) {
      return cached.status;
    }

    try {
      const response = await fetch(`/api/share-status?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Share status request failed with ${response.status}`);
      }

      const data = (await response.json()) as Partial<ShareStatusResponse>;
      const result: ShareStatusResponse = {
        sharedToday: Boolean(data.sharedToday),
        shareCountToday: typeof data.shareCountToday === 'number' ? data.shareCountToday : 0,
        totalShares: typeof data.totalShares === 'number' ? data.totalShares : 0,
        lastShareAt: typeof data.lastShareAt === 'number' ? data.lastShareAt : null,
      };

      this.cache.set(cacheKey, { status: result, fetchedAt: Date.now() });
      this.persistLocal(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch share status:', error);
      const fallback = this.restoreLocal(cacheKey) ?? {
        sharedToday: false,
        shareCountToday: 0,
        totalShares: 0,
        lastShareAt: null,
      };
      this.cache.set(cacheKey, { status: fallback, fetchedAt: Date.now() });
      return fallback;
    }
  }

  recordShareSuccess(username: string, timestamp: number): void {
    const cacheKey = username.toLowerCase();
    const previous = this.cache.get(cacheKey)?.status;
    const status: ShareStatusResponse = {
      sharedToday: true,
      shareCountToday: Math.max((previous?.shareCountToday ?? 0) + 1, 1),
      totalShares: (previous?.totalShares ?? 0) + 1,
      lastShareAt: timestamp,
    };
    this.cache.set(cacheKey, { status, fetchedAt: Date.now() });
    this.persistLocal(cacheKey, status);
  }

  hasShownPromptToday(username: string): boolean {
    try {
      const cacheKey = username.toLowerCase();
      const value = localStorage.getItem(`hexomind_share_prompt:${cacheKey}`);
      if (!value) return false;
      const today = new Date().toISOString().split('T')[0];
      return value === today;
    } catch (error) {
      logger.warn('Unable to read share prompt marker:', error);
      return false;
    }
  }

  markPromptShown(username: string): void {
    try {
      const cacheKey = username.toLowerCase();
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(`hexomind_share_prompt:${cacheKey}`, today);
    } catch (error) {
      logger.warn('Unable to persist share prompt marker:', error);
    }
  }

  private persistLocal(key: string, status: ShareStatusResponse): void {
    try {
      const payload = JSON.stringify({
        status,
        timestamp: Date.now(),
      });
      localStorage.setItem(`hexomind_share_status:${key}`, payload);
    } catch (error) {
      logger.warn('Unable to persist share status cache:', error);
    }
  }

  private restoreLocal(key: string): ShareStatusResponse | null {
    try {
      const value = localStorage.getItem(`hexomind_share_status:${key}`);
      if (!value) {
        return null;
      }
      const parsed = JSON.parse(value) as { status: ShareStatusResponse };
      return parsed.status ?? null;
    } catch (error) {
      logger.warn('Unable to restore share status cache:', error);
      return null;
    }
  }
}

export const shareService = new ShareService();
