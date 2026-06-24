import { describe, it, expect, vi, beforeEach } from "vitest";

// Create a Notification mock that works as both constructor and has static props
const mockNotificationInstance = vi.fn();
const MockNotification: any = mockNotificationInstance;
MockNotification.permission = "granted";
MockNotification.requestPermission = vi.fn().mockResolvedValue("granted");

const mockWindow: any = {
  focus: vi.fn(),
  location: { href: "" },
  atob: (s: string) => Buffer.from(s, "base64").toString("binary"),
  Notification: MockNotification,
};

vi.stubGlobal("navigator", {
  serviceWorker: {
    register: vi.fn(),
  },
});

vi.stubGlobal("Notification", MockNotification);
vi.stubGlobal("window", mockWindow);

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: null,
}));

// Mock fetch
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));

import {
  registerServiceWorker,
  requestNotificationPermission,
  checkAndNotifyGoalCompletion,
  showLocalNotification,
} from "@/lib/notifications";

describe("registerServiceWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when service worker is not supported", async () => {
    vi.stubGlobal("navigator", {});
    const result = await registerServiceWorker();
    expect(result).toBeNull();
    vi.stubGlobal("navigator", {
      serviceWorker: { register: vi.fn() },
    });
  });

  it("returns registration on success", async () => {
    const mockReg = { installing: null, waiting: null, active: {} };
    (navigator.serviceWorker.register as any).mockResolvedValueOnce(mockReg);
    const result = await registerServiceWorker();
    expect(result).toBe(mockReg);
  });

  it("returns null on registration failure", async () => {
    (navigator.serviceWorker.register as any).mockRejectedValueOnce(new Error("SW failed"));
    const result = await registerServiceWorker();
    expect(result).toBeNull();
  });
});

describe("requestNotificationPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when permission is granted", async () => {
    MockNotification.requestPermission = vi.fn().mockResolvedValue("granted");
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
  });

  it("returns false when permission is denied", async () => {
    MockNotification.requestPermission = vi.fn().mockResolvedValue("denied");
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });

  it("returns false when Notification is not in window", async () => {
    // Remove Notification from window (simulating browser that doesn't support it)
    const saved = mockWindow.Notification;
    mockWindow.Notification = undefined;
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
    mockWindow.Notification = saved;
  });
});

describe("checkAndNotifyGoalCompletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockNotification.permission = "granted";
    mockNotificationInstance.mockClear();
  });

  it("returns true when all goals are met", () => {
    const result = checkAndNotifyGoalCompletion({
      pagesReadToday: 30,
      pagesGoal: 30,
      bibleChaptersToday: 3,
      bibleChaptersGoal: 3,
    });
    expect(result).toBe(true);
  });

  it("returns false when pages goal not met", () => {
    const result = checkAndNotifyGoalCompletion({
      pagesReadToday: 10,
      pagesGoal: 30,
      bibleChaptersToday: 3,
      bibleChaptersGoal: 3,
    });
    expect(result).toBe(false);
  });

  it("returns false when bible goal not met", () => {
    const result = checkAndNotifyGoalCompletion({
      pagesReadToday: 30,
      pagesGoal: 30,
      bibleChaptersToday: 1,
      bibleChaptersGoal: 3,
    });
    expect(result).toBe(false);
  });

  it("returns true when pagesGoal is 0 (no goal set)", () => {
    const result = checkAndNotifyGoalCompletion({
      pagesReadToday: 0,
      pagesGoal: 0,
      bibleChaptersToday: 3,
      bibleChaptersGoal: 3,
    });
    expect(result).toBe(true);
  });

  it("returns true when bibleChaptersGoal is 0 (no goal set)", () => {
    const result = checkAndNotifyGoalCompletion({
      pagesReadToday: 30,
      pagesGoal: 30,
      bibleChaptersToday: 0,
      bibleChaptersGoal: 0,
    });
    expect(result).toBe(true);
  });

  it("returns false when both goals not met", () => {
    const result = checkAndNotifyGoalCompletion({
      pagesReadToday: 5,
      pagesGoal: 30,
      bibleChaptersToday: 0,
      bibleChaptersGoal: 3,
    });
    expect(result).toBe(false);
  });
});

describe("showLocalNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when Notification permission is not granted", () => {
    MockNotification.permission = "denied";
    showLocalNotification("Title", "Body");
    expect(mockNotificationInstance).not.toHaveBeenCalled();
  });

  it("creates notification when permission is granted", () => {
    MockNotification.permission = "granted";
    showLocalNotification("Test Title", "Test Body", "/test");
    expect(mockNotificationInstance).toHaveBeenCalledWith("Test Title", expect.objectContaining({
      body: "Test Body",
      tag: "disciplina-local",
    }));
  });
});
