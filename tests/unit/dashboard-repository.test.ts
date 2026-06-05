import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardRepository, type DashboardData } from "@/lib/repositories/dashboard-repository";
import { DashboardService } from "@/lib/services/dashboard-service";

// Mock Supabase client
const mockRpc = vi.fn();
const mockClient = { rpc: mockRpc } as any;

describe("DashboardRepository", () => {
  let repo: DashboardRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new DashboardRepository(mockClient);
  });

  it("calls get_dashboard_data RPC with user id", async () => {
    const mockData: DashboardData = {
      books: [],
      bibleGoal: null,
      settings: null,
      todayStats: null,
      bibleTodayCount: 0,
      streak: 5,
      weekStats: [],
      calendarData: [],
      xp: null,
      challenges: [],
      insights: [],
      achievements: [],
    };
    mockRpc.mockResolvedValue({ data: mockData, error: null });

    const result = await repo.getDashboardData("user-1");

    expect(mockRpc).toHaveBeenCalledWith("get_dashboard_data", { p_user_id: "user-1" });
    expect(result).toEqual(mockData);
  });

  it("returns null when RPC returns error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC failed" } });

    const result = await repo.getDashboardData("user-1");

    expect(result).toBeNull();
  });

  it("returns null when RPC throws", async () => {
    mockRpc.mockRejectedValue(new Error("Connection failed"));

    const result = await repo.getDashboardData("user-1");

    expect(result).toBeNull();
  });

  it("returns data with all fields populated", async () => {
    const mockData: DashboardData = {
      books: [{ id: "b1", title: "Test Book" }],
      bibleGoal: { daily_chapters: 3 },
      settings: { pomodoro_duration: 25 },
      todayStats: { goals_completed: true },
      bibleTodayCount: 2,
      streak: 7,
      weekStats: [{ day: "Seg", date: "2024-01-01", is_today: true, pages: 10, chapters: 1, pomodoros: 2 }],
      calendarData: [{ date: "2024-01-01", done: true, partial: false }],
      xp: { total_xp: 500, current_level: 3 },
      challenges: [{ challenge_id: "c1", progress: 50, target: 100, completed: false, xp_reward: 30, week_key: "2024-W01" }],
      insights: [{ insight_type: "streak", message: "Great streak!" }],
      achievements: [{ achievement_id: "a1", progress: 100, completed: true, unlocked_at: "2024-01-01" }],
    };
    mockRpc.mockResolvedValue({ data: mockData, error: null });

    const result = await repo.getDashboardData("user-1");

    expect(result).toEqual(mockData);
    expect(result!.books).toHaveLength(1);
    expect(result!.streak).toBe(7);
    expect(result!.xp!.total_xp).toBe(500);
  });
});

describe("DashboardService", () => {
  let service: DashboardService;
  let mockRepo: { getDashboardData: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = { getDashboardData: vi.fn() };
    service = new DashboardService(mockRepo as any);
  });

  it("delegates to repository", async () => {
    const mockData = { books: [], streak: 0 } as any;
    mockRepo.getDashboardData.mockResolvedValue(mockData);

    const result = await service.getDashboardData("user-1");

    expect(mockRepo.getDashboardData).toHaveBeenCalledWith("user-1");
    expect(result).toEqual(mockData);
  });

  it("returns null when repository returns null", async () => {
    mockRepo.getDashboardData.mockResolvedValue(null);

    const result = await service.getDashboardData("user-1");

    expect(result).toBeNull();
  });

  it("returns null when repository throws", async () => {
    mockRepo.getDashboardData.mockRejectedValue(new Error("DB error"));

    const result = await service.getDashboardData("user-1");

    expect(result).toBeNull();
  });
});
