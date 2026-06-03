import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimitService } from "@/lib/rate-limit";

describe("RateLimitService", () => {
  beforeEach(() => {
    RateLimitService.reset();
  });

  describe("check", () => {
    it("allows requests within limit", () => {
      const result = RateLimitService.check("192.168.1.1", "ai", { limit: 5, windowMs: 60_000, name: "ai" });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it("blocks requests exceeding limit", () => {
      const config = { limit: 3, windowMs: 60_000, name: "test" };
      RateLimitService.check("10.0.0.1", "test", config);
      RateLimitService.check("10.0.0.1", "test", config);
      RateLimitService.check("10.0.0.1", "test", config);
      const result = RateLimitService.check("10.0.0.1", "test", config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("separates limits by IP", () => {
      const config = { limit: 2, windowMs: 60_000, name: "test" };
      RateLimitService.check("1.1.1.1", "test", config);
      RateLimitService.check("1.1.1.1", "test", config);
      const result = RateLimitService.check("2.2.2.2", "test", config);
      expect(result.allowed).toBe(true);
    });

    it("resets after window expires", () => {
      vi.useFakeTimers();
      const config = { limit: 2, windowMs: 1_000, name: "test" };
      RateLimitService.check("1.1.1.1", "test", config);
      RateLimitService.check("1.1.1.1", "test", config);
      const blocked = RateLimitService.check("1.1.1.1", "test", config);
      expect(blocked.allowed).toBe(false);

      vi.advanceTimersByTime(1_001);
      const afterExpiry = RateLimitService.check("1.1.1.1", "test", config);
      expect(afterExpiry.allowed).toBe(true);
      vi.useRealTimers();
    });

    it("returns unknown config as allowed", () => {
      const result = RateLimitService.check("1.1.1.1", "nonexistent_rule");
      expect(result.allowed).toBe(true);
    });
  });

  describe("checkRequest", () => {
    it("returns null when allowed", () => {
      const req = new Request("http://localhost/api/ai", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      });
      const result = RateLimitService.checkRequest(req, "ai");
      expect(result).toBeNull();
    });

    it("returns 429 Response when rate limited", () => {
      const config = { limit: 1, windowMs: 60_000, name: "test" };
      const req = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "5.5.5.5" },
      });
      RateLimitService.checkRequest(req, "test", config);
      const response = RateLimitService.checkRequest(req, "test", config);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(429);
    });
  });

  describe("extractIp", () => {
    it("extracts from x-forwarded-for", () => {
      const req = new Request("http://localhost", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      });
      expect(RateLimitService.extractIp(req)).toBe("1.2.3.4");
    });

    it("extracts from x-real-ip", () => {
      const req = new Request("http://localhost", {
        headers: { "x-real-ip": "9.8.7.6" },
      });
      expect(RateLimitService.extractIp(req)).toBe("9.8.7.6");
    });

    it("returns unknown when no headers", () => {
      const req = new Request("http://localhost");
      expect(RateLimitService.extractIp(req)).toBe("unknown");
    });
  });

  describe("cleanup", () => {
    it("removes expired entries", () => {
      vi.useFakeTimers();
      const config = { limit: 10, windowMs: 1_000, name: "cleanup_test" };
      RateLimitService.check("1.1.1.1", "cleanup_test", config);
      vi.advanceTimersByTime(1_001);
      const removed = RateLimitService.cleanup();
      expect(removed).toBe(1);
      vi.useRealTimers();
    });
  });

  describe("getEntryCount", () => {
    it("tracks active entries", () => {
      expect(RateLimitService.getEntryCount()).toBe(0);
      RateLimitService.check("1.1.1.1", "ai");
      expect(RateLimitService.getEntryCount()).toBe(1);
    });
  });
});
