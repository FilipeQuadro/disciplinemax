import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, setRequestId, getRequestId, generateRequestId } from "@/lib/logger";

describe("logger", () => {
  let logCalls: string[] = [];
  let errorCalls: string[] = [];
  let warnCalls: string[] = [];

  beforeEach(() => {
    logCalls = [];
    errorCalls = [];
    warnCalls = [];
    vi.spyOn(console, "log").mockImplementation((msg: string) => { logCalls.push(msg); });
    vi.spyOn(console, "error").mockImplementation((msg: string) => { errorCalls.push(msg); });
    vi.spyOn(console, "warn").mockImplementation((msg: string) => { warnCalls.push(msg); });
  });

  afterEach(() => {
    setRequestId(undefined);
    vi.restoreAllMocks();
  });

  it("logs info with correct structure", () => {
    logger.info("test message");
    expect(logCalls.length).toBeGreaterThan(0);
    const parsed = JSON.parse(logCalls[0]);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.service).toBe("disciplina");
    expect(parsed.timestamp).toBeDefined();
  });

  it("logs error with correct level", () => {
    logger.error("error message");
    expect(errorCalls.length).toBeGreaterThan(0);
    const parsed = JSON.parse(errorCalls[0]);
    expect(parsed.level).toBe("error");
  });

  it("logs warn with correct level", () => {
    logger.warn("warn message");
    expect(warnCalls.length).toBeGreaterThan(0);
    const parsed = JSON.parse(warnCalls[0]);
    expect(parsed.level).toBe("warn");
  });

  it("logs debug with correct level", () => {
    logger.debug("debug message");
    expect(logCalls.length).toBeGreaterThan(0);
    const parsed = JSON.parse(logCalls[0]);
    expect(parsed.level).toBe("debug");
  });

  it("includes extra data in log entry", () => {
    logger.info("test", { userId: "123", action: "login" });
    const parsed = JSON.parse(logCalls[0]);
    expect(parsed.userId).toBe("123");
    expect(parsed.action).toBe("login");
  });

  it("includes requestId when set", () => {
    setRequestId("req-123");
    logger.info("test with request id");
    const parsed = JSON.parse(logCalls[0]);
    expect(parsed.requestId).toBe("req-123");
  });

  it("does not include requestId when not set", () => {
    setRequestId(undefined);
    logger.info("test without request id");
    const parsed = JSON.parse(logCalls[0]);
    expect(parsed.requestId).toBeUndefined();
  });
});

describe("requestId", () => {
  it("generates unique IDs", () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).not.toBe(id2);
  });

  it("sets and gets request ID", () => {
    setRequestId("test-id");
    expect(getRequestId()).toBe("test-id");
    setRequestId(undefined);
  });
});
