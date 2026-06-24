import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

import { callOllama, getBibleVerseOfDay } from "@/lib/ai";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const mockFetch = fetchWithTimeout as unknown as ReturnType<typeof vi.fn>;

describe("callOllama", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns text from Ollama on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "  Stay motivated!  " }),
    });
    const result = await callOllama("Motivate me");
    expect(result).toBe("Stay motivated!");
  });

  it("returns null when Ollama returns empty response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "  " }),
    });
    const result = await callOllama("Motivate me");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));
    const result = await callOllama("Motivate me");
    expect(result).toBeNull();
  });

  it("calls Ollama with default model llama3.2:3b", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "ok" }),
    });
    await callOllama("test");
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.model).toBe("llama3.2:3b");
  });

  it("calls Ollama with custom model when specified", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "ok" }),
    });
    await callOllama("test", "gemma:7b");
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.model).toBe("gemma:7b");
  });
});

describe("getBibleVerseOfDay", () => {
  it("returns a verse with verse text and reference", async () => {
    const result = await getBibleVerseOfDay();
    expect(result).toHaveProperty("verse");
    expect(result).toHaveProperty("reference");
    expect(typeof result.verse).toBe("string");
    expect(typeof result.reference).toBe("string");
    expect(result.verse.length).toBeGreaterThan(0);
    expect(result.reference.length).toBeGreaterThan(0);
  });

  it("returns consistent verse for same day", async () => {
    const first = await getBibleVerseOfDay();
    const second = await getBibleVerseOfDay();
    expect(first.verse).toBe(second.verse);
    expect(first.reference).toBe(second.reference);
  });
});
