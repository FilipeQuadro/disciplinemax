import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, getLimit, canDoAction, type PlanType } from "@/lib/plans";

describe("Plans", () => {
  describe("PLAN_LIMITS", () => {
    it("should have limits for all plan types", () => {
      expect(PLAN_LIMITS.free).toBeDefined();
      expect(PLAN_LIMITS.pro).toBeDefined();
      expect(PLAN_LIMITS.premium).toBeDefined();
    });

    it("free plan has expected limits", () => {
      expect(PLAN_LIMITS.free.maxBooks).toBe(5);
      expect(PLAN_LIMITS.free.maxPomodorosPerDay).toBe(8);
      expect(PLAN_LIMITS.free.aiMotivationPerDay).toBe(3);
      expect(PLAN_LIMITS.free.weeklyReport).toBe(false);
    });

    it("pro plan has expected limits", () => {
      expect(PLAN_LIMITS.pro.maxBooks).toBe(20);
      expect(PLAN_LIMITS.pro.maxPomodorosPerDay).toBe(Infinity);
      expect(PLAN_LIMITS.pro.weeklyReport).toBe(true);
    });

    it("premium plan has unlimited features", () => {
      expect(PLAN_LIMITS.premium.maxBooks).toBe(Infinity);
      expect(PLAN_LIMITS.premium.maxPomodorosPerDay).toBe(Infinity);
      expect(PLAN_LIMITS.premium.aiMotivationPerDay).toBe(Infinity);
    });
  });

  describe("getLimit", () => {
    it("should return limit for a plan and feature", () => {
      expect(getLimit("free", "maxBooks")).toBe(5);
      expect(getLimit("pro", "maxBooks")).toBe(20);
      expect(getLimit("premium", "maxBooks")).toBe(Infinity);
    });

    it("should return ambient sounds count", () => {
      expect(getLimit("free", "ambientSounds")).toBe(1);
      expect(getLimit("pro", "ambientSounds")).toBe(3);
    });
  });

  describe("canDoAction", () => {
    it("should return true when under limit", () => {
      expect(canDoAction("free", "maxBooks", 3)).toBe(true);
      expect(canDoAction("free", "maxPomodorosPerDay", 5)).toBe(true);
    });

    it("should return false when at or over limit", () => {
      expect(canDoAction("free", "maxBooks", 5)).toBe(false);
      expect(canDoAction("free", "maxPomodorosPerDay", 8)).toBe(false);
    });

    it("should always return true for unlimited features", () => {
      expect(canDoAction("pro", "maxPomodorosPerDay", 100)).toBe(true);
      expect(canDoAction("premium", "maxBooks", 999)).toBe(true);
    });
  });
});
