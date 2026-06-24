import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase for books route
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

let chainable: any;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => chainable),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
        error: null,
      }),
    },
  })),
}));

vi.mock("@/lib/logger", () => ({
  initRequestId: vi.fn(),
  logger: { info: vi.fn(), error: vi.fn() },
  generateRequestId: vi.fn(() => "test-id"),
}));

import { POST as booksHandler } from "@/app/api/books/route";

function createBooksRequest(body: any, token = "valid-token") {
  return new Request("https://test.com/api/books", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("Integration: /api/books", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainable = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    };
    chainable.then = (resolve: any) => resolve({ data: [], error: null });
  });

  it("rejects request without authorization", async () => {
    const req = createBooksRequest({ action: "select" }, "");
    const res = await booksHandler(req as any);
    expect(res.status).toBe(401);
  });

  it("rejects invalid request body", async () => {
    const req = createBooksRequest({ action: "invalid_action" });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("handles insert action", async () => {
    chainable.then = (resolve: any) => resolve({ data: { id: "1", title: "Test" }, error: null });
    const req = createBooksRequest({
      action: "insert",
      payload: { title: "Test Book", daily_goal: 30 },
    });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(200);
  });

  it("rejects insert with mismatched user_id", async () => {
    const req = createBooksRequest({
      action: "insert",
      payload: { title: "Test", user_id: "different-user" },
    });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(403);
  });

  it("handles select action", async () => {
    chainable.then = (resolve: any) => resolve({ data: [{ id: "1" }], error: null });
    const req = createBooksRequest({ action: "select" });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(200);
  });

  it("handles update action", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { user_id: "test-user-id" }, error: null });
    chainable.then = (resolve: any) => resolve({ data: { id: "1" }, error: null });
    const req = createBooksRequest({
      action: "update",
      id: "book-1",
      payload: { title: "Updated" },
    });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(200);
  });

  it("rejects update of another user's book", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { user_id: "other-user" }, error: null });
    const req = createBooksRequest({
      action: "update",
      id: "book-1",
      payload: { title: "Updated" },
    });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(403);
  });

  it("handles delete action", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { user_id: "test-user-id" }, error: null });
    chainable.then = (resolve: any) => resolve({ error: null });
    const req = createBooksRequest({
      action: "delete",
      id: "book-1",
    });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(200);
  });

  it("rejects delete of another user's book", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { user_id: "other-user" }, error: null });
    const req = createBooksRequest({
      action: "delete",
      id: "book-1",
    });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(403);
  });

  it("rejects invalid action", async () => {
    const req = createBooksRequest({
      action: "drop",
      payload: { title: "Test" },
    });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("handles database error on insert", async () => {
    chainable.then = (resolve: any) => resolve({ data: null, error: { message: "DB error" } });
    const req = createBooksRequest({
      action: "insert",
      payload: { title: "Test Book" },
    });
    const res = await booksHandler(req as any);
    expect(res.status).toBe(400);
  });
});
