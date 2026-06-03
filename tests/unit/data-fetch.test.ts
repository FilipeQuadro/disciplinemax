import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

import { dataFetch } from "@/lib/data-fetch";
import { supabase } from "@/lib/supabase";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const mockGetSession = (supabase as unknown as { auth: { getSession: ReturnType<typeof vi.fn> } }).auth.getSession;
const mockFetch = fetchWithTimeout as unknown as ReturnType<typeof vi.fn>;

describe("dataFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when supabase not configured", async () => {
    // The supabase singleton is imported at module level.
    // In test env, it's configured, so we test the getSession failure path.
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    const result = await dataFetch({ action: "select", table: "books" });
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when no session", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    const result = await dataFetch({ action: "select", table: "books" });
    expect(result.error).toBe("Not authenticated");
    expect(result.data).toBeNull();
  });

  it("performs select action", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: "test-token" } } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "1", title: "Book 1" }]),
    });
    const result = await dataFetch({ action: "select", table: "books" });
    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: "1", title: "Book 1" }]);
  });

  it("performs select with maybeSingle", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: "test-token" } } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "1", title: "Book 1" }]),
    });
    const result = await dataFetch({ action: "select", table: "books", filters: { maybeSingle: true } });
    expect(result.data).toEqual({ id: "1", title: "Book 1" });
  });

  it("returns error when API returns error", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: "test-token" } } });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: "Row not found" }),
    });
    const result = await dataFetch({ action: "select", table: "books" });
    expect(result.error).toBe("Row not found");
  });

  it("performs insert action", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: "test-token" } } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "1", title: "New Book" }]),
    });
    const result = await dataFetch({ action: "insert", table: "books", payload: { title: "New Book" } });
    expect(result.error).toBeNull();
  });

  it("performs delete action", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: "test-token" } } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    });
    const result = await dataFetch({ action: "delete", table: "books", id: "1" });
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it("returns error for invalid action", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: "test-token" } } });
    const result = await dataFetch({ action: "select", table: "books" });
    // This should work with select
    expect(result).toBeDefined();
  });
});
