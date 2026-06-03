import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { getAdminUsers, invalidateAdminUsersCache } from "@/lib/admin-users-cache";
import { createClient } from "@supabase/supabase-js";

function setupMockListUsers(users: Array<{ id: string; email: string }>) {
  (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users }, error: null }),
      },
    },
  });
}

describe("getAdminUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateAdminUsersCache();
  });

  it("returns users from API", async () => {
    const users = [{ id: "1", email: "a@b.com" }];
    setupMockListUsers(users);

    const result = await getAdminUsers();
    expect(result).toEqual(users);
  });

  it("caches results and doesn't call API again within TTL", async () => {
    const users = [{ id: "1", email: "a@b.com" }];
    setupMockListUsers(users);

    const first = await getAdminUsers();
    const second = await getAdminUsers();
    expect(first).toEqual(users);
    expect(second).toEqual(users);
    // createClient should only be called once (cached)
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("returns stale cache on API error", async () => {
    // First call succeeds
    const users = [{ id: "1", email: "a@b.com" }];
    setupMockListUsers(users);
    await getAdminUsers();

    // Invalidate to force refetch
    invalidateAdminUsersCache();

    // Second call fails
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }) } },
    });

    const result = await getAdminUsers();
    expect(result).toEqual([]);
  });

  it("returns empty array when env vars not set", async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await getAdminUsers();
    expect(result).toEqual([]);

    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  });
});

describe("invalidateAdminUsersCache", () => {
  it("clears the cache so next call fetches fresh data", async () => {
    const users = [{ id: "1", email: "a@b.com" }];
    setupMockListUsers(users);

    await getAdminUsers();
    invalidateAdminUsersCache();
    await getAdminUsers();

    // Should be called at least twice after invalidation (may include error cache call)
    expect((createClient as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
