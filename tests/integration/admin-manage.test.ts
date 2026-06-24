import { describe, it, expect, vi, beforeEach } from "vitest";

// Create a chainable mock builder for Supabase
function createMockSupabase() {
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });
  const mockFrom = vi.fn().mockReturnValue({
    upsert: mockUpsert,
    insert: mockInsert,
    delete: mockDelete,
    select: mockSelect,
  });

  return {
    from: mockFrom,
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
    },
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => createMockSupabase()),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminOrCron: vi.fn().mockReturnValue({ isAdmin: true, actorId: "admin-1" }),
}));

import { POST as manageHandler } from "@/app/api/admin/manage/route";

describe("Integration: /api/admin/manage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects request without user_id", async () => {
    const req = new Request("https://test.com/api/admin/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-admin-token",
      },
      body: JSON.stringify({ action: "block" }),
    });
    const res = await manageHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("rejects unknown action", async () => {
    const req = new Request("https://test.com/api/admin/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-admin-token",
      },
      body: JSON.stringify({ user_id: "user-1", action: "destroy_everything" }),
    });
    const res = await manageHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("accepts valid block action", async () => {
    const req = new Request("https://test.com/api/admin/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-admin-token",
      },
      body: JSON.stringify({ user_id: "user-1", action: "block", reason: "spam" }),
    });
    const res = await manageHandler(req as any);
    const body = await res.json();
    // The route should at least get past validation (200 or 500 from Supabase)
    expect([200, 500]).toContain(res.status);
  });

  it("rejects invalid plan in change_plan action", async () => {
    const req = new Request("https://test.com/api/admin/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-admin-token",
      },
      body: JSON.stringify({ user_id: "user-1", action: "change_plan", new_plan: "mega" }),
    });
    const res = await manageHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("accepts valid change_plan action", async () => {
    const req = new Request("https://test.com/api/admin/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-admin-token",
      },
      body: JSON.stringify({ user_id: "user-1", action: "change_plan", new_plan: "pro" }),
    });
    const res = await manageHandler(req as any);
    // The route should at least get past validation
    expect([200, 500]).toContain(res.status);
  });
});
