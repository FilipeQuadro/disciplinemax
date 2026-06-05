import { LeaderboardRepository, type LeaderboardEntry } from "@/lib/repositories/leaderboard-repository";

export type LeaderboardCategory = "xp" | "streak" | "pomodoros" | "pages";

export class LeaderboardService {
  private repo: LeaderboardRepository;

  constructor(repo?: LeaderboardRepository) {
    this.repo = repo ?? new LeaderboardRepository();
  }

  async getLeaderboard(category: LeaderboardCategory, limit = 25): Promise<LeaderboardEntry[]> {
    switch (category) {
      case "xp":
        return this.repo.getXpLeaderboard(limit);
      case "streak":
        return this.repo.getStreakLeaderboard(limit);
      case "pomodoros":
        return this.repo.getPomodoroLeaderboard(limit);
      case "pages":
        return this.repo.getPagesLeaderboard(limit);
      default:
        return this.repo.getXpLeaderboard(limit);
    }
  }
}
