import { beforeEach, describe, expect, it, vi } from 'vitest';

interface LocalStorageStub extends Storage {
  store: Map<string, string>;
}

let fetchMock: ReturnType<typeof vi.fn>;
let localStorageStub: LocalStorageStub;

beforeEach(() => {
  vi.resetModules();

  const cryptoGlobal = globalThis as any;
  const existingCrypto = cryptoGlobal.crypto;
  if (existingCrypto) {
    if (typeof existingCrypto.randomUUID === 'function') {
      vi.spyOn(existingCrypto, 'randomUUID').mockImplementation(() => 'test-uuid');
    } else {
      existingCrypto.randomUUID = vi.fn(() => 'test-uuid');
    }
  } else {
    Object.defineProperty(cryptoGlobal, 'crypto', {
      value: { randomUUID: vi.fn(() => 'test-uuid') },
      configurable: true
    });
  }

  const store = new Map<string, string>();
  localStorageStub = {
    store,
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number): string | null {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    get length(): number {
      return store.size;
    },
  } as LocalStorageStub;

  (globalThis as unknown as { localStorage: LocalStorageStub }).localStorage = localStorageStub;
  (globalThis as any).window = { location: { search: '' } };

  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({}),
  }));

  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('HighScoreService username management', () => {
  it('provides a usable initialization promise and resolves usernames', async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ username: 'reddit_user' }),
    } as any));

    const { HighScoreService } = await import('../src/client/services/HighScoreService');
    const service = new HighScoreService();

    const initPromise = service.waitForInitialization();
    expect(initPromise).toBeInstanceOf(Promise);

    await initPromise;
    expect(await service.getUsername()).toBe('reddit_user');
  });

  it('persists custom usernames locally when the server is unavailable', async () => {
    fetchMock.mockImplementation(async (input: unknown) => {
      if (typeof input === 'string' && input.includes('/api/commit-username')) {
        throw new Error('network unavailable');
      }

      return {
        ok: true,
        json: async () => ({}),
      } as any;
    });

    const { HighScoreService } = await import('../src/client/services/HighScoreService');
    const service = new HighScoreService();

    await service.awaitReady();
    const result = await service.setCustomUsername('ArcadeHero');

    expect(result.success).toBe(true);
    expect(result.offlineFallback).toBe(true);
    expect(await service.getUsername()).toBe('ArcadeHero');
    expect(localStorageStub.getItem('hexomind_custom_username')).not.toBeNull();

    const freshService = new HighScoreService();
    await freshService.awaitReady();
    expect(await freshService.getUsername()).toBe('ArcadeHero');
  });
});
