import { describe, it, expect } from "vitest";
import { getGuardState, shouldRedirectToLogin, shouldRedirectToHome } from "@/lib/auth-guard-logic";
import type { GuardParams } from "@/lib/auth-guard-logic";

const mockUser = { id: "user-1" };

describe("getGuardState", () => {
  it("returns 'timeout' when timedOut and no user", () => {
    const params: GuardParams = { user: null, loading: true, timedOut: true, blocked: false, isPublic: false, isOnboarding: false };
    expect(getGuardState(params)).toBe("timeout");
  });

  it("returns 'loading' when loading and not timed out without user", () => {
    const params: GuardParams = { user: null, loading: true, timedOut: false, blocked: false, isPublic: false, isOnboarding: false };
    expect(getGuardState(params)).toBe("loading");
  });

  it("returns 'public' when isPublic regardless of auth state", () => {
    const params: GuardParams = { user: null, loading: false, timedOut: false, blocked: false, isPublic: true, isOnboarding: false };
    expect(getGuardState(params)).toBe("public");
  });

  it("returns 'public' even when user is present", () => {
    const params: GuardParams = { user: mockUser, loading: false, timedOut: false, blocked: false, isPublic: true, isOnboarding: false };
    expect(getGuardState(params)).toBe("public");
  });

  it("returns 'unauthenticated' when no user and not public", () => {
    const params: GuardParams = { user: null, loading: false, timedOut: false, blocked: false, isPublic: false, isOnboarding: false };
    expect(getGuardState(params)).toBe("unauthenticated");
  });

  it("returns 'onboarding' when user present and isOnboarding", () => {
    const params: GuardParams = { user: mockUser, loading: false, timedOut: false, blocked: false, isPublic: false, isOnboarding: true };
    expect(getGuardState(params)).toBe("onboarding");
  });

  it("returns 'blocked' when user present, not onboarding, and blocked", () => {
    const params: GuardParams = { user: mockUser, loading: false, timedOut: false, blocked: true, isPublic: false, isOnboarding: false };
    expect(getGuardState(params)).toBe("blocked");
  });

  it("returns 'authenticated' when user present, not blocked, not onboarding", () => {
    const params: GuardParams = { user: mockUser, loading: false, timedOut: false, blocked: false, isPublic: false, isOnboarding: false };
    expect(getGuardState(params)).toBe("authenticated");
  });

  it("prioritizes timeout over loading", () => {
    const params: GuardParams = { user: null, loading: true, timedOut: true, blocked: false, isPublic: false, isOnboarding: false };
    expect(getGuardState(params)).toBe("timeout");
  });

  it("does not return timeout when timedOut but user exists", () => {
    const params: GuardParams = { user: mockUser, loading: false, timedOut: true, blocked: false, isPublic: false, isOnboarding: false };
    expect(getGuardState(params)).toBe("authenticated");
  });

  it("prioritizes onboarding over blocked", () => {
    const params: GuardParams = { user: mockUser, loading: false, timedOut: false, blocked: true, isPublic: false, isOnboarding: true };
    expect(getGuardState(params)).toBe("onboarding");
  });
});

describe("shouldRedirectToLogin", () => {
  it("returns true when not loading, not timed out, no user, not public, not onboarding", () => {
    expect(shouldRedirectToLogin({ loading: false, timedOut: false, user: null, isPublic: false, isOnboarding: false })).toBe(true);
  });

  it("returns false when loading", () => {
    expect(shouldRedirectToLogin({ loading: true, timedOut: false, user: null, isPublic: false, isOnboarding: false })).toBe(false);
  });

  it("returns false when timed out", () => {
    expect(shouldRedirectToLogin({ loading: false, timedOut: true, user: null, isPublic: false, isOnboarding: false })).toBe(false);
  });

  it("returns false when user is present", () => {
    expect(shouldRedirectToLogin({ loading: false, timedOut: false, user: mockUser, isPublic: false, isOnboarding: false })).toBe(false);
  });

  it("returns false when isPublic", () => {
    expect(shouldRedirectToLogin({ loading: false, timedOut: false, user: null, isPublic: true, isOnboarding: false })).toBe(false);
  });

  it("returns false when isOnboarding", () => {
    expect(shouldRedirectToLogin({ loading: false, timedOut: false, user: null, isPublic: false, isOnboarding: true })).toBe(false);
  });
});

describe("shouldRedirectToHome", () => {
  it("returns true when not loading, not timed out, user present, isPublic", () => {
    expect(shouldRedirectToHome({ loading: false, timedOut: false, user: mockUser, isPublic: true })).toBe(true);
  });

  it("returns false when no user", () => {
    expect(shouldRedirectToHome({ loading: false, timedOut: false, user: null, isPublic: true })).toBe(false);
  });

  it("returns false when not public", () => {
    expect(shouldRedirectToHome({ loading: false, timedOut: false, user: mockUser, isPublic: false })).toBe(false);
  });

  it("returns false when loading", () => {
    expect(shouldRedirectToHome({ loading: true, timedOut: false, user: mockUser, isPublic: true })).toBe(false);
  });

  it("returns false when timed out", () => {
    expect(shouldRedirectToHome({ loading: false, timedOut: true, user: mockUser, isPublic: true })).toBe(false);
  });
});
