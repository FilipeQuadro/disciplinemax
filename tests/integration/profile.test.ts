import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetProfile, mockUpsertProfile, mockEnsureProfile } = vi.hoisted(() => ({
  mockGetProfile: vi.fn(),
  mockUpsertProfile: vi.fn(),
  mockEnsureProfile: vi.fn(),
}));

vi.mock("@/lib/services/profile-service", () => ({
  ProfileService: class {
    getProfile = mockGetProfile;
    upsertProfile = mockUpsertProfile;
    ensureProfile = mockEnsureProfile;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET, PUT, POST } from "@/app/api/profile/route";

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when userId is missing", async () => {
    const req = new Request("https://test.com/api/profile");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when profile not found", async () => {
    mockGetProfile.mockResolvedValueOnce(null);
    const req = new Request("https://test.com/api/profile?userId=u1");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns profile when found", async () => {
    mockGetProfile.mockResolvedValueOnce({ user_id: "u1", username: "filipe" });
    const req = new Request("https://test.com/api/profile?userId=u1");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on invalid input", async () => {
    const req = new Request("https://test.com/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 409 when username is taken", async () => {
    mockUpsertProfile.mockResolvedValueOnce(null);
    const req = new Request("https://test.com/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", username: "taken" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(409);
  });

  it("returns profile on successful update", async () => {
    mockUpsertProfile.mockResolvedValueOnce({ user_id: "u1" });
    const req = new Request("https://test.com/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", username: "filipe" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when userId is missing", async () => {
    const req = new Request("https://test.com/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 when profile creation fails", async () => {
    mockEnsureProfile.mockResolvedValueOnce(null);
    const req = new Request("https://test.com/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns profile on successful creation", async () => {
    mockEnsureProfile.mockResolvedValueOnce({ user_id: "u1", referral_code: "ABC" });
    const req = new Request("https://test.com/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", displayName: "Filipe" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
