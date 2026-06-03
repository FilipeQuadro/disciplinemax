import { logger } from "@/lib/logger";
import { MetricsService } from "@/lib/metrics";

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheConfig {
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Maximum entries in the cache (LRU eviction) */
  maxSize: number;
  /** Namespace for metrics/logging */
  namespace: string;
}

const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  settings: { ttlMs: 5 * 60_000, maxSize: 500, namespace: "settings" },
  user_books: { ttlMs: 2 * 60_000, maxSize: 500, namespace: "user_books" },
  user_bible_goals: { ttlMs: 5 * 60_000, maxSize: 500, namespace: "user_bible_goals" },
  user_stats: { ttlMs: 60_000, maxSize: 1000, namespace: "user_stats" },
};

/**
 * In-process application cache with TTL, LRU eviction, and metrics.
 * Generic and type-safe — no `any`.
 */
export class ApplicationCacheService {
  private static entries = new Map<string, CacheEntry<unknown>>();
  private static configs = DEFAULT_CONFIGS;
  private static accessOrder = new Map<string, number>();
  private static accessCounter = 0;

  /**
   * Get a cached value by key.
   * Returns null if not found or expired.
   */
  static get<T>(key: string, namespace: string): T | null {
    const config = this.configs[namespace];
    const fullKey = `${namespace}:${key}`;
    const entry = this.entries.get(fullKey);

    if (!entry) {
      MetricsService.increment("cache_miss", { namespace });
      return null;
    }

    if (Date.now() >= entry.expiresAt) {
      this.entries.delete(fullKey);
      this.accessOrder.delete(fullKey);
      MetricsService.increment("cache_miss", { namespace });
      MetricsService.increment("cache_expired", { namespace });
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(fullKey, ++this.accessCounter);
    MetricsService.increment("cache_hit", { namespace });
    return entry.value as T;
  }

  /**
   * Store a value in the cache with TTL.
   */
  static set<T>(key: string, value: T, namespace: string, ttlMs?: number): void {
    const config = this.configs[namespace];
    if (!config) return;

    const fullKey = `${namespace}:${key}`;
    const ttl = ttlMs ?? config.ttlMs;

    // Evict if at capacity
    if (this.entries.size >= config.maxSize && !this.entries.has(fullKey)) {
      this.evictOldest(namespace);
    }

    this.entries.set(fullKey, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
    this.accessOrder.set(fullKey, ++this.accessCounter);
  }

  /**
   * Get or set — returns cached value if present, otherwise calls the
   * factory, caches the result, and returns it.
   */
  static async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    namespace: string,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key, namespace);
    if (cached !== null) return cached;

    const start = Date.now();
    const value = await factory();
    const duration = Date.now() - start;

    this.set(key, value, namespace, ttlMs);

    MetricsService.increment("cache_fill", { namespace });
    MetricsService.recordDuration("cache_fill_duration_ms", duration, { namespace });

    return value;
  }

  /**
   * Invalidate a specific key.
   */
  static invalidate(key: string, namespace: string): boolean {
    const fullKey = `${namespace}:${key}`;
    this.accessOrder.delete(fullKey);
    return this.entries.delete(fullKey);
  }

  /**
   * Invalidate all entries in a namespace.
   */
  static invalidateNamespace(namespace: string): number {
    const prefix = `${namespace}:`;
    let removed = 0;
    const keys = Array.from(this.entries.keys());
    for (const k of keys) {
      if (k.startsWith(prefix)) {
        this.entries.delete(k);
        this.accessOrder.delete(k);
        removed++;
      }
    }
    if (removed > 0) {
      logger.info("Cache namespace invalidated", { namespace, removed });
    }
    return removed;
  }

  /**
   * Cleanup all expired entries.
   */
  static cleanup(): number {
    const now = Date.now();
    let removed = 0;
    const keys = Array.from(this.entries.keys());
    for (const k of keys) {
      const entry = this.entries.get(k);
      if (entry && now >= entry.expiresAt) {
        this.entries.delete(k);
        this.accessOrder.delete(k);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Get cache statistics.
   */
  static getStats(): {
    size: number;
    namespaces: Record<string, { size: number; maxSize: number; ttlMs: number }>;
  } {
    const namespaces: Record<string, { size: number; maxSize: number; ttlMs: number }> = {};
    for (const [ns, config] of Object.entries(this.configs)) {
      const prefix = `${ns}:`;
      let count = 0;
      const keys = Array.from(this.entries.keys());
      for (const k of keys) {
        if (k.startsWith(prefix)) count++;
      }
      namespaces[ns] = { size: count, maxSize: config.maxSize, ttlMs: config.ttlMs };
    }
    return { size: this.entries.size, namespaces };
  }

  /** Reset all entries (for testing) */
  static reset(): void {
    this.entries.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  private static evictOldest(namespace: string): void {
    const prefix = `${namespace}:`;
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [k, accessTime] of Array.from(this.accessOrder.entries())) {
      if (k.startsWith(prefix) && accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      this.entries.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      MetricsService.increment("cache_evicted", { namespace });
    }
  }
}
