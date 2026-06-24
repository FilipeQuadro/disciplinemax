import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApplicationCacheService } from "@/lib/cache";

describe("ApplicationCacheService", () => {
  beforeEach(() => {
    ApplicationCacheService.reset();
  });

  describe("get/set", () => {
    it("stores and retrieves values", () => {
      ApplicationCacheService.set("key1", { name: "test" }, "settings");
      const result = ApplicationCacheService.get<{ name: string }>("key1", "settings");
      expect(result).toEqual({ name: "test" });
    });

    it("returns null for missing keys", () => {
      const result = ApplicationCacheService.get("nonexistent", "settings");
      expect(result).toBeNull();
    });

    it("returns null for expired entries", () => {
      vi.useFakeTimers();
      ApplicationCacheService.set("key1", "value", "settings", 1000);
      vi.advanceTimersByTime(1001);
      const result = ApplicationCacheService.get("key1", "settings");
      expect(result).toBeNull();
      vi.useRealTimers();
    });
  });

  describe("getOrSet", () => {
    it("returns cached value when available", async () => {
      ApplicationCacheService.set("key1", "cached", "settings");
      const factory = vi.fn().mockResolvedValue("fresh");
      const result = await ApplicationCacheService.getOrSet("key1", factory, "settings");
      expect(result).toBe("cached");
      expect(factory).not.toHaveBeenCalled();
    });

    it("calls factory when no cached value", async () => {
      const factory = vi.fn().mockResolvedValue("fresh");
      const result = await ApplicationCacheService.getOrSet("key1", factory, "settings");
      expect(result).toBe("fresh");
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("invalidate", () => {
    it("removes a specific key", () => {
      ApplicationCacheService.set("key1", "value1", "settings");
      ApplicationCacheService.set("key2", "value2", "settings");
      const removed = ApplicationCacheService.invalidate("key1", "settings");
      expect(removed).toBe(true);
      expect(ApplicationCacheService.get("key1", "settings")).toBeNull();
      expect(ApplicationCacheService.get("key2", "settings")).toBe("value2");
    });
  });

  describe("invalidateNamespace", () => {
    it("removes all entries in a namespace", () => {
      ApplicationCacheService.set("k1", "v1", "settings");
      ApplicationCacheService.set("k2", "v2", "settings");
      ApplicationCacheService.set("k3", "v3", "user_books");
      const removed = ApplicationCacheService.invalidateNamespace("settings");
      expect(removed).toBe(2);
      expect(ApplicationCacheService.get("k1", "settings")).toBeNull();
      expect(ApplicationCacheService.get("k3", "user_books")).toBe("v3");
    });
  });

  describe("cleanup", () => {
    it("removes expired entries", () => {
      vi.useFakeTimers();
      ApplicationCacheService.set("k1", "v1", "settings", 1000);
      ApplicationCacheService.set("k2", "v2", "settings", 5000);
      vi.advanceTimersByTime(1001);
      const removed = ApplicationCacheService.cleanup();
      expect(removed).toBe(1);
      expect(ApplicationCacheService.get("k2", "settings")).toBe("v2");
      vi.useRealTimers();
    });
  });

  describe("getStats", () => {
    it("returns cache statistics", () => {
      ApplicationCacheService.set("k1", "v1", "settings");
      ApplicationCacheService.set("k2", "v2", "user_books");
      const stats = ApplicationCacheService.getStats();
      expect(stats.size).toBe(2);
      expect(stats.namespaces.settings.size).toBe(1);
      expect(stats.namespaces.user_books.size).toBe(1);
    });
  });

  describe("LRU eviction", () => {
    it("evicts oldest entry when at capacity", () => {
      // user_stats namespace has maxSize: 1000, so use custom logic
      // Fill to capacity using settings namespace (maxSize: 500)
      for (let i = 0; i < 501; i++) {
        ApplicationCacheService.set(`key_${i}`, `value_${i}`, "settings");
      }
      // First entry should be evicted
      expect(ApplicationCacheService.get("key_0", "settings")).toBeNull();
      // Later entries should still exist
      expect(ApplicationCacheService.get("key_500", "settings")).toBe("value_500");
    });
  });
});
