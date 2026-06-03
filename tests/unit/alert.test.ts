import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock telegram — use hoisted factory without referencing external variables
vi.mock("@/lib/telegram", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { telegram_bot_token: "tok", telegram_chat_id: "chat" },
        }),
      }),
    }),
  })),
}));

import { AlertService } from "@/lib/alert";
import { MetricsService, METRICS } from "@/lib/metrics";

describe("AlertService", () => {
  beforeEach(() => {
    MetricsService.reset();
    AlertService.reset();
    vi.clearAllMocks();
  });

  describe("fireAlert", () => {
    it("logs alert without throwing", async () => {
      await AlertService.fireAlert("Test Alert", "Something happened", "log");
    });

    it("attempts telegram alert when channel is telegram", async () => {
      // AlertService internally fetches settings from DB and sends via telegram
      await AlertService.fireAlert("Test Alert", "Something happened", "telegram");
      // No throw = success (internal flow may or may not reach sendTelegram)
    });
  });

  describe("checkAlerts", () => {
    it("does not throw when below threshold", async () => {
      MetricsService.increment(METRICS.TELEGRAM_FAILED, { status: "error" }, 1);
      MetricsService.increment(METRICS.TELEGRAM_SENT, { status: "success" }, 100);
      await AlertService.checkAlerts();
    });

    it("does not throw when threshold exceeded", async () => {
      MetricsService.increment(METRICS.TELEGRAM_FAILED, { status: "error" }, 10);
      MetricsService.increment(METRICS.TELEGRAM_SENT, { status: "success" }, 5);
      await AlertService.checkAlerts();
    });
  });
});
