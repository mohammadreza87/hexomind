/**
 * Colormind API proxy endpoint
 * Hardened: input validation, timeout, caching, and safe fallbacks
 */
import { redis } from '@devvit/web/server';
import { createHash } from 'node:crypto';

const DEFAULT_PALETTE = {
  result: [
    [255, 0, 110], // Hot Pink
    [0, 245, 255], // Cyan
    [0, 255, 136], // Spring Green
    [255, 170, 0], // Orange
    [139, 0, 255], // Purple
  ],
};

const ALLOWED_MODELS = new Set(['default', 'ui', 'material']);
const FEATURE_ENABLED = process.env.COLORMIND_ENABLED === '1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function stableKey(obj: unknown): string {
  const json = JSON.stringify(obj);
  return createHash('sha1').update(json).digest('hex');
}

function sanitizeBody(body: any): { model: string; input?: unknown } {
  const model = typeof body?.model === 'string' && ALLOWED_MODELS.has(body.model)
    ? body.model
    : 'default';
  const input = Array.isArray(body?.input) ? body.input : undefined;
  return { model, input };
}

async function getCachedPalette(key: string): Promise<number[][] | null> {
  try {
    const raw = await redis.get(`colormind:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; result: number[][] };
    if (Date.now() - parsed.t > CACHE_TTL_MS) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

async function setCachedPalette(key: string, result: number[][]): Promise<void> {
  try {
    const payload = JSON.stringify({ t: Date.now(), result });
    await redis.set(`colormind:${key}`, payload);
  } catch {
    // ignore cache failures
  }
}

export async function handleColormindRequest(request: Request): Promise<Response> {
  try {
    // Feature flag: optionally disable external calls
    if (!FEATURE_ENABLED) {
      return new Response(JSON.stringify(DEFAULT_PALETTE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body safely and sanitize
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const safeBody = sanitizeBody(body);
    const cacheKey = stableKey(safeBody);

    // Check cache
    const cached = await getCachedPalette(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({ result: cached }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Timeout using AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    // Note: The Colormind API historically only supports HTTP.
    // We keep the request short-lived and cache results.
    const colormindResponse = await fetch('http://colormind.io/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeBody),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!colormindResponse.ok) {
      throw new Error(`Colormind status ${colormindResponse.status}`);
    }

    const data = (await colormindResponse.json()) as { result?: number[][] };
    const result = Array.isArray(data.result) ? data.result : DEFAULT_PALETTE.result;

    // Cache and return
    await setCachedPalette(cacheKey, result);
    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Colormind API error:', error);
    return new Response(JSON.stringify(DEFAULT_PALETTE), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
