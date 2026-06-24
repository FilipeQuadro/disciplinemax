import { InsightRepository, type UserInsight } from "@/lib/repositories/insight-repository";
import { StreakRepository } from "@/lib/repositories/streak-repository";
import { XpRepository } from "@/lib/repositories/xp-repository";
import { AchievementRepository } from "@/lib/repositories/achievement-repository";

export type InsightType = "best_study_hour" | "productivity_trend" | "near_achievement" | "streak_risk" | "weekly_comparison" | "consistency_tip";

export class InsightService {
  private insightRepo: InsightRepository;
  private streakRepo: StreakRepository;
  private xpRepo: XpRepository;
  private achievementRepo: AchievementRepository;

  constructor(
    insightRepo?: InsightRepository,
    streakRepo?: StreakRepository,
    xpRepo?: XpRepository,
    achievementRepo?: AchievementRepository,
  ) {
    this.insightRepo = insightRepo ?? new InsightRepository();
    this.streakRepo = streakRepo ?? new StreakRepository();
    this.xpRepo = xpRepo ?? new XpRepository();
    this.achievementRepo = achievementRepo ?? new AchievementRepository();
  }

  /** Generate fresh insights for a user (called by cron daily) */
  async generateInsights(userId: string): Promise<UserInsight[]> {
    const insights: Array<{ type: InsightType; message: string; data: Record<string, unknown> }> = [];

    // 1. Best study hour
    const bestHour = await this.computeBestStudyHour(userId);
    if (bestHour) {
      insights.push({
        type: "best_study_hour",
        message: `Seu melhor horário de estudo é às ${bestHour}h. Tente estudar mais nesse período!`,
        data: { hour: bestHour },
      });
    }

    // 2. Productivity trend
    const trend = await this.computeProductivityTrend(userId);
    if (trend === "up") {
      insights.push({
        type: "productivity_trend",
        message: "Sua produtividade aumentou esta semana! Continue assim! 📈",
        data: { trend: "up" },
      });
    } else if (trend === "down") {
      insights.push({
        type: "productivity_trend",
        message: "Sua produtividade diminuiu um pouco esta semana. Que tal retomar o foco? 💪",
        data: { trend: "down" },
      });
    }

    // 3. Near achievement
    const nearAchievement = await this.findNearAchievement(userId);
    if (nearAchievement) {
      insights.push({
        type: "near_achievement",
        message: `Você está perto de desbloquear "${nearAchievement.label}"! Falta pouco! 🏆`,
        data: { achievement_id: nearAchievement.id, progress: nearAchievement.progress },
      });
    }

    // 4. Streak risk
    const streakRisk = await this.checkStreakRisk(userId);
    if (streakRisk) {
      insights.push({
        type: "streak_risk",
        message: "Sua streak está em risco! Complete suas metas de hoje para não perdê-la! 🔥",
        data: { risk: true },
      });
    }

    // 5. Weekly comparison
    const comparison = await this.computeWeeklyComparison(userId);
    if (comparison && comparison !== "same") {
      const isUp = comparison === "up";
      insights.push({
        type: "weekly_comparison",
        message: isUp
          ? "Você completou mais metas que na semana passada! 🌟"
          : "Semana passada foi melhor. Vamos superar nesta! 💪",
        data: { comparison },
      });
    }

    // 6. Consistency tip
    const streak = await this.streakRepo.getStreak(userId);
    if (streak && streak.consistency_rate < 0.5 && streak.current_streak === 0) {
      insights.push({
        type: "consistency_tip",
        message: "Dica: estabeleça uma meta mínima diária. Mesmo 5 minutos contam para a streak! ⏰",
        data: { consistency_rate: streak.consistency_rate },
      });
    }

    // Persist insights
    const results: UserInsight[] = [];
    for (const insight of insights) {
      const saved = await this.insightRepo.addInsight({
        user_id: userId,
        insight_type: insight.type,
        message: insight.message,
        data: insight.data,
      });
      if (saved) results.push(saved);
    }

    return results;
  }

  async getInsights(userId: string, limit = 10): Promise<UserInsight[]> {
    return this.insightRepo.getInsights(userId, limit);
  }

  private async computeBestStudyHour(userId: string): Promise<number | null> {
    try {
      const data = await this.insightRepo.getCompletedPomodoros(userId, 30, 100);

      if (!data || data.length < 3) return null;

      const hourCounts: Record<number, number> = {};
      for (const session of data) {
        const hour = new Date(session.started_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }

      let bestHour = 0;
      let maxCount = 0;
      for (const [hour, count] of Object.entries(hourCounts)) {
        if (count > maxCount) {
          maxCount = count;
          bestHour = parseInt(hour, 10);
        }
      }

      return bestHour;
    } catch { return null; }
  }

  private async computeProductivityTrend(userId: string): Promise<"up" | "down" | "same" | null> {
    try {
      const thisWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const lastWeek = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];

      const [thisWeekData, lastWeekData] = await Promise.all([
        this.insightRepo.getDailyStatsInRange(userId, thisWeek),
        this.insightRepo.getDailyStatsInRange(userId, lastWeek, thisWeek),
      ]);

      const thisCount = (thisWeekData || []).filter((s) => s.goals_completed).length;
      const lastCount = (lastWeekData || []).filter((s) => s.goals_completed).length;

      if (thisCount > lastCount) return "up";
      if (thisCount < lastCount) return "down";
      return "same";
    } catch { return null; }
  }

  private async findNearAchievement(userId: string): Promise<{ id: string; label: string; progress: number } | null> {
    try {
      const achievements = await this.achievementRepo.getUnlocked(userId);
      const unlockedIds = new Set(achievements.filter((a) => a.completed).map((a) => a.achievement_id));

      // Find in-progress achievements closest to completion
      const inProgress = achievements
        .filter((a) => !a.completed && a.progress > 50)
        .sort((a, b) => b.progress - a.progress);

      if (inProgress.length > 0) {
        const { ACHIEVEMENTS } = await import("./achievement-service");
        const def = ACHIEVEMENTS.find((a) => a.id === inProgress[0].achievement_id);
        if (def) return { id: def.id, label: def.label, progress: inProgress[0].progress };
      }

      return null;
    } catch { return null; }
  }

  private async checkStreakRisk(userId: string): Promise<boolean> {
    try {
      const streak = await this.streakRepo.getStreak(userId);
      if (!streak || streak.current_streak === 0) return false;

      const today = new Date().toISOString().split("T")[0];
      if (streak.last_active_date === today) return false;

      // Streak > 0 but not active today — at risk
      return true;
    } catch { return false; }
  }

  private async computeWeeklyComparison(userId: string): Promise<"up" | "down" | "same" | null> {
    return this.computeProductivityTrend(userId);
  }
}
