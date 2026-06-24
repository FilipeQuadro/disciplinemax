import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ data: [], error: null }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    },
  })),
}));

import { POST as dataHandler } from "@/app/api/data/route";

describe("Integration: /api/data — Zod validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects request with invalid action", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ action: "drop_table", table: "books" }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid request body");
  });

  it("rejects request without table name", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ action: "select" }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(400);
  });

  it("rejects request with invalid JSON body", async () => {
    const req = new Request("https://test.com/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: "Bearer valid-token",
      },
      body: "not json",
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
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ action: "select", table: "books", filters: { limit: -5 } }),
    });
    const res = await dataHandler(req);
    expect(res.status).toBe(400);
  });
});
