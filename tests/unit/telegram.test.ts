import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetchWithTimeout before importing telegram
vi.mock("@/lib/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

import { sendTelegramMessage } from "@/lib/telegram";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const mockFetch = fetchWithTimeout as unknown as ReturnType<typeof vi.fn>;

function mockResponse(ok: boolean, body: Record<string, unknown>) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(body),
  };
}

describe("sendTelegramMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for short/empty bot token", async () => {
    const result = await sendTelegramMessage("", "123", "hello");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("inválido");
  });

  it("returns error for non-numeric chat ID", async () => {
    const result = await sendTelegramMessage("123456:ABC", "abc", "hello");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Chat ID inválido");
  });

  it("sends message successfully", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, { ok: true, result: {} }));
    const result = await sendTelegramMessage("123456:ABC-DEF", "123456789", "Hello!");
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles 'chat not found' error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(false, { ok: false, description: "Bad Request: chat not found" })
    );
    const result = await sendTelegramMessage("123456:ABC-DEF", "999", "Hi");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Chat não encontrado");
  });

  it("handles 'bot was blocked' error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(false, { ok: false, description: "Forbidden: bot was blocked by the user" })
    );
    const result = await sendTelegramMessage("123456:ABC-DEF", "123", "Hi");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("bloqueado");
  });

  it("handles invalid token error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(false, { ok: false, description: "Unauthorized" })
    );
    const result = await sendTelegramMessage("123456:ABC-DEF", "123", "Hi");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Token do bot inválido");
  });

  it("retries without Markdown on parse error", async () => {
    // First call: parse error
    mockFetch.mockResolvedValueOnce(
      mockResponse(false, { ok: false, description: "Bad Request: can't parse entities" })
    );
    // Second call (retry): success
    mockFetch.mockResolvedValueOnce(mockResponse(true, { ok: true, result: {} }));

    const result = await sendTelegramMessage("123456:ABC-DEF", "123", "Hello *bold*");
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Verify second call has no markdown
    const secondCall = mockFetch.mock.calls[1];
    const body = JSON.parse(secondCall[1].body);
    expect(body.text).not.toContain("*");
  });

  it("returns generic error for unknown API error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(false, { ok: false, description: "Too many requests" })
    );
    const result = await sendTelegramMessage("123456:ABC-DEF", "123", "Hi");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Too many requests");
  });
});
