import { logger } from "@/lib/logger";
import { MetricsService } from "@/lib/metrics";

export interface RateLimitConfig {
  /** Max requests allowed within the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Unique key for this rate limit rule (used in logs/metrics) */
  name: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  ai: { limit: 10, windowMs: 60_000, name: "ai" },
  auth: { limit: 20, windowMs: 60_000, name: "auth" },
  notifications: { limit: 30, windowMs: 60_000, name: "notifications" },
  admin: { limit: 60, windowMs: 60_000, name: "admin" },
};

/**
 * In-process, IP-based rate limiter.
 * Uses a sliding-window counter per IP per rule.
 * No external dependencies — just memory.
 */
export class RateLimitService {
  private static entries = new Map<string, RateLimitEntry>();
  private static configs = DEFAULT_CONFIGS;

  /**
   * Check if a request is allowed under the given rate limit rule.
   * Returns { allowed, remaining, resetAt }.
   */
  static check(ip: string, ruleName: string, config?: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    limit: number;
  } {
    const rule = config ?? this.configs[ruleName];
    if (!rule) {
      return { allowed: true, remaining: Infinity, resetAt: 0, limit: 0 };
    }

    const key = `${ruleName}:${ip}`;
    const now = Date.now();
    let entry = this.entries.get(key);

    // Reset if window expired
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + rule.windowMs };
      this.entries.set(key, entry);
    }

    entry.count++;

    const allowed = entry.count <= rule.limit;
    const remaining = Math.max(0, rule.limit - entry.count);

    if (!allowed) {
      MetricsService.increment("rate_limit_exceeded", { rule: ruleName });
      logger.warn("Rate limit exceeded", {
        rule: ruleName,
        ip,
        count: entry.count,
        limit: rule.limit,
        windowMs: rule.windowMs,
      });
    }

    MetricsService.increment("rate_limit_check", { rule: ruleName, allowed: allowed ? "true" : "false" });

    return { allowed, remaining, resetAt: entry.resetAt, limit: rule.limit };
  }

  /**
   * Convenience: extract IP from Request and check rate limit.
   * Returns null if allowed, or a Response if rate-limited.
   */
  static checkRequest(req: Request, ruleName: string, config?: RateLimitConfig): Response | null {
    const ip = this.extractIp(req);
    const result = this.check(ip, ruleName, config);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          retry_after_ms: result.resetAt - Date.now(),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
          },
        }
      );
    }

    return null;
  }

  /**
   * Extract client IP from request headers.
   * Handles Render, Cloudflare, and direct connections.
   */
  static extractIp(req: Request): string {
    return (
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      req.headers.get("cf-connecting-ip") ??
      "unknown"
    );
  }

  /** Cleanup expired entries (call periodically) */
  static cleanup(): number {
    const now = Date.now();
    let removed = 0;
    const keys = Array.from(this.entries.keys());
    for (const key of keys) {
      const entry = this.entries.get(key);
      if (entry && now >= entry.resetAt) {
        this.entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Reset all entries (for testing) */
  static reset(): void {
    this.entries.clear();
  }

  /** Get current entry count (for observability) */
  static getEntryCount(): number {
    return this.entries.size;
  }
}
