import { describe, it, expect, vi, beforeEach } from "vitest";
import { initRequestId, getRequestId, setRequestId, generateRequestId, logger } from "@/lib/logger";

describe("RequestId", () => {
  beforeEach(() => {
    setRequestId(undefined);
  });

  describe("generateRequestId", () => {
    it("generates unique IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it("generates non-empty strings", () => {
      expect(generateRequestId().length).toBeGreaterThan(0);
    });
  });

  describe("setRequestId / getRequestId", () => {
    it("sets and gets request ID", () => {
      setRequestId("test-123");
      expect(getRequestId()).toBe("test-123");
    });

    it("returns undefined when not set", () => {
      expect(getRequestId()).toBeUndefined();
    });
  });

  describe("initRequestId", () => {
    it("extracts x-request-id from headers", () => {
      const req = new Request("http://localhost", {
        headers: { "x-request-id": "middleware-123" },
      });
      const id = initRequestId(req);
      expect(id).toBe("middleware-123");
      expect(getRequestId()).toBe("middleware-123");
    });

    it("generates new ID when no header", () => {
      const req = new Request("http://localhost");
      const id = initRequestId(req);
      expect(id).toBeTruthy();
      expect(getRequestId()).toBe(id);
    });
  });

  describe("logger with requestId", () => {
    it("includes requestId in log output", () => {
      const logCalls: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => { logCalls.push(msg); };

      setRequestId("req-abc");
      logger.info("test message");

      console.log = origLog;
      const lastLog = logCalls[logCalls.length - 1];
      expect(lastLog).toContain("req-abc");
    });
  });
});
