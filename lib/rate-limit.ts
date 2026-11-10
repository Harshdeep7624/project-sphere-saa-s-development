import type { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number; // Unix timestamp in ms
}

// In-memory sliding window store (active in development or as fallback if Redis is unreachable)
const rateLimitStore = new Map<string, RateLimitRecord>();

let lastCleanup = Date.now();

function cleanupExpiredKeys() {
  const now = Date.now();
  if (now - lastCleanup < 60000 && rateLimitStore.size < 1000) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter: number; // Seconds to wait
}

/**
 * Synchronous in-memory rate limiting check.
 * Used in local development or as an instant fallback.
 */
export function checkRateLimitSync(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  cleanupExpiredKeys();

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key);

  if (!record || now >= record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      reset: Math.ceil(resetTime / 1000),
      retryAfter: 0,
    };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
  const reset = Math.ceil(record.resetTime / 1000);

  if (record.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset,
      retryAfter,
    };
  }

  return {
    success: true,
    limit,
    remaining,
    reset,
    retryAfter: 0,
  };
}

/**
 * Checks whether distributed Upstash Redis rate limiting is configured in the environment.
 */
export function isDistributedRateLimitingEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Asynchronous production-ready rate limiter.
 * - When UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN are set: uses Upstash Redis REST
 *   for atomic, multi-instance serverless rate limiting.
 * - When Redis credentials are not configured or if an API call times out:
 *   gracefully falls back to the local in-memory store so development and offline workflows never break.
 *
 * @param key Unique identifier (e.g. `login:ip:127.0.0.1`, `register:ip:...`)
 * @param limit Max allowed requests within the window
 * @param windowSeconds Duration of the rate limit window in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!upstashUrl || !upstashToken) {
    return checkRateLimitSync(key, limit, windowSeconds);
  }

  try {
    // Standard Redis Lua script for atomic fixed-window rate limiting
    const script = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      local ttl = redis.call('TTL', KEYS[1])
      return {current, ttl}
    `;

    // Normalizing URL endpoint
    const endpoint = upstashUrl.replace(/\/+$/, "");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", script, 1, `ps:${key}`, windowSeconds]),
      // Strict 2-second timeout so API routes never get blocked by external Redis latency
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Upstash rate-limit HTTP ${response.status}; falling back to in-memory store.`);
      return checkRateLimitSync(key, limit, windowSeconds);
    }

    const data = (await response.json()) as {
      result?: [number, number];
      error?: string;
    };

    if (data.error || !Array.isArray(data.result)) {
      console.warn("Upstash rate-limit returned an unexpected payload; falling back to in-memory store.");
      return checkRateLimitSync(key, limit, windowSeconds);
    }

    const currentCount = Number(data.result[0]) || 1;
    const ttlSeconds = Math.max(1, Number(data.result[1]) || windowSeconds);

    const remaining = Math.max(0, limit - currentCount);
    const retryAfter = currentCount > limit ? ttlSeconds : 0;
    const reset = Math.ceil(Date.now() / 1000) + ttlSeconds;

    if (currentCount > limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset,
        retryAfter,
      };
    }

    return {
      success: true,
      limit,
      remaining,
      reset,
      retryAfter: 0,
    };
  } catch (error) {
    // Seamless fallback to in-memory store on network errors or timeouts
    console.warn("Upstash Redis rate-limit check failed; falling back to in-memory store:", error instanceof Error ? error.message : "network error");
    return checkRateLimitSync(key, limit, windowSeconds);
  }
}

/**
 * Extracts a normalized client IP address from request headers.
 */
export function getClientIp(request: Request | NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return "127.0.0.1";
}
