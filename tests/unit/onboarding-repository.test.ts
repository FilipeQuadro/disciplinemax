import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { OnboardingRepository, type OnboardingProgress } from "@/lib/repositories/onboarding-repository";

function createChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.then = (resolve: any) => resolve({ data: null, error: null, ...overrides });
  Object.assign(chain, overrides);
  return chain;
}

describe("OnboardingRepository", () => {
  let repo: OnboardingRepository;
  let chain: any;
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createChainable();
    const fromMock = vi.fn().mockReturnValue(chain);
    client = { from: fromMock };
    repo = new OnboardingRepository(client);
  });

  describe("getProgress", () => {
    it("returns progress when found", async () => {
      const progress: OnboardingProgress = {
        user_id: "u1", step: 2, step_data: { area: "devocional" },
        completed: false, activation_date: null, created_at: "", updated_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: progress, error: null });
      const result = await repo.getProgress("u1");
      expect(result).toEqual(progress);
      expect(client.from).toHaveBeenCalledWith("onboarding_progress");
      expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    });

    it("returns null when not found", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.getProgress("nonexistent");
      expect(result).toBeNull();
    });

    it("returns null on database error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "db error" } });
      const result = await repo.getProgress("u1");
      expect(result).toBeNull();
    });

    it("calls select with *", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      await repo.getProgress("u1");
      expect(chain.select).toHaveBeenCalledWith("*");
    });
  });

  describe("saveStep", () => {
    it("upserts step and returns data", async () => {
      const saved: OnboardingProgress = {
        user_id: "u1", step: 3, step_data: { objective: "consistency" },
        completed: false, activation_date: null, created_at: "", updated_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: saved, error: null });
      const result = await repo.saveStep("u1", 3, { objective: "consistency" });
      expect(result).toEqual(saved);
      expect(client.from).toHaveBeenCalledWith("onboarding_progress");
      expect(chain.upsert).toHaveBeenCalled();
    });

    it("defaults step_data to empty object", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      await repo.saveStep("u1", 1);
      const upsertCall = chain.upsert.mock.calls[0][0];
      expect(upsertCall.step_data).toEqual({});
    });

    it("returns null on database error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "db error" } });
      const result = await repo.saveStep("u1", 1);
      expect(result).toBeNull();
    });

    it("sets onConflict to user_id", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      await repo.saveStep("u1", 2, {});
      const upsertOpts = chain.upsert.mock.calls[0][1];
      expect(upsertOpts.onConflict).toBe("user_id");
    });
  });

  describe("completeOnboarding", () => {
    it("upserts completion with step 4 and completed=true", async () => {
      const completed: OnboardingProgress = {
        user_id: "u1", step: 4, step_data: {},
        completed: true, activation_date: "2024-01-01", created_at: "", updated_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: completed, error: null });
      const result = await repo.completeOnboarding("u1");
      expect(result).toEqual(completed);
      const upsertCall = chain.upsert.mock.calls[0][0];
      expect(upsertCall.completed).toBe(true);
      expect(upsertCall.step).toBe(4);
      expect(upsertCall.activation_date).toBeDefined();
    });

    it("returns null on database error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "db error" } });
      const result = await repo.completeOnboarding("u1");
      expect(result).toBeNull();
    });
  });
});
