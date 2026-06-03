import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
        }),
        limit: vi.fn().mockReturnValue({ data: null, error: null }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockReturnValue({ data: { user: { id: "user-1" } }, error: null }),
    },
  })),
}));

vi.mock("@/lib/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      candidates: [{ content: { parts: [{ text: "Stay motivated!" }] } }],
    }),
  }),
}));

vi.mock("@/lib/ai", () => ({
  callOllama: vi.fn().mockResolvedValue("Ollama response"),
}));

import { POST as aiHandler } from "@/app/api/ai/route";

describe("Integration: /api/ai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects request without prompt", async () => {
    const req = new Request("https://test.com/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await aiHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("rejects empty prompt", async () => {
    const req = new Request("https://test.com/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "" }),
    });
    const res = await aiHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("accepts valid prompt and returns text", async () => {
    const req = new Request("https://test.com/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Motivate me!" }),
    });
    const res = await aiHandler(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBeDefined();
    expect(typeof body.text).toBe("string");
    expect(["gemini", "ollama", "static"]).toContain(body.provider);
  });

  it("never returns 500 — always falls back to static", async () => {
    const { fetchWithTimeout } = await import("@/lib/fetch-with-timeout");
    (fetchWithTimeout as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

    const req = new Request("https://test.com/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Test" }),
    });
    const res = await aiHandler(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBeDefined();
    // Provider can be "ollama" or "static" depending on mock state
    expect(["ollama", "static"]).toContain(body.provider);
  });
});
