import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch-with-timeout
vi.mock("@/lib/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

// Mock supabase-js for getGeminiKeyFromDB
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
  })),
}));

import { getMotivationalMessage, callOllama, getBibleVerseOfDay } from "@/lib/ai";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const mockFetch = fetchWithTimeout as unknown as ReturnType<typeof vi.fn>;

describe("getMotivationalMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env for each test
    delete process.env.GEMINI_API_KEY;
  });

  it("returns static motivation for streak 0 when no AI available", async () => {
    // No GEMINI_API_KEY, Ollama fails
    mockFetch.mockRejectedValueOnce(new Error("No Ollama"));
    const result = await getMotivationalMessage({
      streak: 0,
      booksRead: 0,
      bibleChapters: 0,
      completedToday: false,
    });
    expect(result).toContain("primeiro dia");
  });

  it("returns static motivation for streak < 7 when no AI available", async () => {
    mockFetch.mockRejectedValueOnce(new Error("No Ollama"));
    const result = await getMotivationalMessage({
      streak: 3,
      booksRead: 1,
      bibleChapters: 0,
      completedToday: false,
    });
    expect(result).toContain("3 dias seguidos");
  });

  it("returns static motivation for streak < 30 when no AI available", async () => {
    mockFetch.mockRejectedValueOnce(new Error("No Ollama"));
    const result = await getMotivationalMessage({
      streak: 15,
      booksRead: 2,
      bibleChapters: 1,
      completedToday: false,
    });
    expect(result).toContain("15 dias de constância");
  });

  it("returns static motivation for streak >= 30 when no AI available", async () => {
    mockFetch.mockRejectedValueOnce(new Error("No Ollama"));
    const result = await getMotivationalMessage({
      streak: 45,
      booksRead: 5,
      bibleChapters: 3,
      completedToday: true,
    });
    expect(result).toContain("45 dias");
    expect(result).toContain("inspiração");
  });

  it("uses Gemini when GEMINI_API_KEY is set and returns text", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: "Mensagem do Gemini!" }] } }],
      }),
    });
    const result = await getMotivationalMessage({
      streak: 5,
      booksRead: 1,
      bibleChapters: 0,
      completedToday: false,
    });
    expect(result).toBe("Mensagem do Gemini!");
    delete process.env.GEMINI_API_KEY;
  });

  it("falls back to Ollama when Gemini returns null text", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    // Gemini returns no text
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: "" }] } }],
      }),
    });
    // Ollama returns text
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "Ollama motivation" }),
    });
    const result = await getMotivationalMessage({
      streak: 5,
      booksRead: 1,
      bibleChapters: 0,
      completedToday: false,
    });
    expect(result).toBe("Ollama motivation");
    delete process.env.GEMINI_API_KEY;
  });

  it("falls back to Ollama when Gemini throws", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    // Gemini fails
    mockFetch.mockRejectedValueOnce(new Error("Gemini down"));
    // Ollama returns text
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "Ollama backup" }),
    });
    const result = await getMotivationalMessage({
      streak: 5,
      booksRead: 1,
      bibleChapters: 0,
      completedToday: false,
    });
    expect(result).toBe("Ollama backup");
    delete process.env.GEMINI_API_KEY;
  });

  it("returns static when both Gemini and Ollama fail", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockFetch.mockRejectedValueOnce(new Error("Gemini down"));
    mockFetch.mockRejectedValueOnce(new Error("Ollama down"));
    const result = await getMotivationalMessage({
      streak: 10,
      booksRead: 1,
      bibleChapters: 0,
      completedToday: false,
    });
    expect(result).toContain("10 dias de constância");
    delete process.env.GEMINI_API_KEY;
  });

  it("returns static when no Gemini key and no Ollama", async () => {
    // No GEMINI_API_KEY set, Ollama fails
    mockFetch.mockRejectedValueOnce(new Error("No Ollama"));
    const result = await getMotivationalMessage({
      streak: 5,
      booksRead: 1,
      bibleChapters: 0,
      completedToday: true,
    });
    expect(result).toContain("5 dias seguidos");
  });

  it("returns static on unexpected error in main try/catch", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    // Make Gemini fetch throw
    mockFetch.mockImplementationOnce(() => {
      throw new Error("Unexpected");
    });
    const result = await getMotivationalMessage({
      streak: 2,
      booksRead: 0,
      bibleChapters: 0,
      completedToday: false,
    });
    expect(result).toContain("2 dias seguidos");
    delete process.env.GEMINI_API_KEY;
  });

  it("includes completedToday context when true", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: "Parabéns!" }] } }],
      }),
    });
    await getMotivationalMessage({
      streak: 5,
      booksRead: 1,
      bibleChapters: 2,
      completedToday: true,
    });
    // Verify the prompt includes completedToday context
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.contents[0].parts[0].text).toContain("JÁ completou");
    delete process.env.GEMINI_API_KEY;
  });
});

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

  it("uses default model llama3.2:3b", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "ok" }),
    });
    await callOllama("test");
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.model).toBe("llama3.2:3b");
  });

  it("uses custom model when specified", async () => {
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
  it("returns verse with text and reference", async () => {
    const result = await getBibleVerseOfDay();
    expect(result).toHaveProperty("verse");
    expect(result).toHaveProperty("reference");
    expect(typeof result.verse).toBe("string");
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
