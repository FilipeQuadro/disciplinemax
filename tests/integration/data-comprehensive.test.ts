import { describe, it, expect, vi, beforeEach } from "vitest";

// Comprehensive mock for supabase
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

vi.mock("@/lib/admin-auth", () => ({
  verifyCronSecret: vi.fn().mockReturnValue(false),
  verifyAdmin: vi.fn().mockReturnValue(null),
  verifyAdminOrCron: vi.fn().mockReturnValue(null),
}));

import { POST as dataHandler } from "@/app/api/data/route";

describe("Integration: /api/data — comprehensive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainable = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    chainable.then = (resolve: any) => resolve({ data: [], error: null });
  });

  it("rejects request with invalid action", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "drop_table", table: "books" }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(400);
  });

  it("rejects request without table name", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "select" }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON body", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "text/plain", Authorization: "Bearer valid-token" },
      body: "not json",
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(400);
  });

  it("rejects empty body", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: "",
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(400);
  });

  it("rejects request without authorization", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "select", table: "books" }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(401);
  });

  it("rejects invalid limit value in filters", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "select", table: "books", filters: { limit: -5 } }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(400);
  });

  it("rejects disallowed table", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "select", table: "secret_table" }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(403);
  });

  it("rejects admin-only table without admin access", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "select", table: "admin_users" }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(403);
  });

  it("rejects insert without payload", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "insert", table: "books" }),
    });
    const res = await dataHandler(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Payload required");
  });

  it("rejects update without id", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "update", table: "books", payload: { title: "Test" } }),
    });
    const res = await dataHandler(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("ID required");
  });

  it("rejects update without payload", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "update", table: "books", id: "123" }),
    });
    const res = await dataHandler(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Payload required");
  });

  it("rejects delete without id", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "delete", table: "books" }),
    });
    const res = await dataHandler(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("ID required");
  });

  it("rejects upsert without payload", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "upsert", table: "books" }),
    });
    const res = await dataHandler(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Payload required");
  });

  it("handles select with filters", async () => {
    chainable.then = (resolve: any) => resolve({ data: [{ id: "1" }], error: null });
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({
        action: "select",
        table: "books",
        filters: { eq: { user_id: "test-user-id" }, limit: 10 },
      }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(200);
  });

  it("handles select with maybeSingle", async () => {
    chainable.maybeSingle.mockResolvedValueOnce({ data: { id: "1" }, error: null });
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({
        action: "select",
        table: "books",
        filters: { maybeSingle: true, eq: { user_id: "test-user-id" } },
      }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(200);
  });

  it("handles select with gte filter", async () => {
    chainable.then = (resolve: any) => resolve({ data: [], error: null });
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({
        action: "select",
        table: "daily_stats",
        filters: { gte: { date: "2024-01-01" } },
      }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(200);
  });

  it("handles insert with payload", async () => {
    chainable.then = (resolve: any) => resolve({ data: { id: "new" }, error: null });
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({
        action: "insert",
        table: "books",
        payload: { title: "Test Book" },
      }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(200);
  });

  it("rejects insert with mismatched user_id", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({
        action: "insert",
        table: "books",
        payload: { title: "Test", user_id: "different-user" },
      }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(403);
  });

  it("handles select with order filter", async () => {
    chainable.then = (resolve: any) => resolve({ data: [], error: null });
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer valid-token" },
      body: JSON.stringify({
        action: "select",
        table: "books",
        filters: { order: { column: "created_at", ascending: true } },
      }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(200);
  });
});
