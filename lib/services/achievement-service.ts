import { AchievementRepository, type UserAchievement } from "@/lib/repositories/achievement-repository";

export interface AchievementDef {
  id: string;
  label: string;
  description: string;
  category: "streak" | "books" | "bible" | "pomodoro" | "xp";
  icon: string;
  color: string;
  condition: (state: AchievementState) => boolean;
  progress: (state: AchievementState) => number; // 0-100
}

export interface AchievementState {
  streak: number;
  longestStreak: number;
  booksCompleted: number;
  totalPagesRead: number;
  bibleChaptersTotal: number;
  pomodorosTotal: number;
  totalXp: number;
  challengesCompleted: number;
}

// 10 essential achievements
export const ACHIEVEMENTS: AchievementDef[] = [
  // Streak
  { id: "streak_3", label: "Início Firme", description: "3 dias seguidos", category: "streak", icon: "Flame", color: "#E8844A",
    condition: (s) => s.streak >= 3, progress: (s) => Math.min((s.streak / 3) * 100, 100) },
  { id: "streak_7", label: "Uma Semana!", description: "7 dias seguidos", category: "streak", icon: "Flame", color: "#D4AF37",
    condition: (s) => s.streak >= 7, progress: (s) => Math.min((s.streak / 7) * 100, 100) },
  { id: "streak_30", label: "Mês Completo", description: "30 dias seguidos", category: "streak", icon: "Flame", color: "#D4AF37",
    condition: (s) => s.streak >= 30, progress: (s) => Math.min((s.streak / 30) * 100, 100) },
  // Books
  { id: "book_first", label: "Primeira Página", description: "Comece seu primeiro livro", category: "books", icon: "BookOpen", color: "#7C6BBD",
    condition: (s) => s.totalPagesRead > 0, progress: (s) => s.totalPagesRead > 0 ? 100 : 0 },
  { id: "book_complete", label: "Concluído!", description: "Termine um livro", category: "books", icon: "BookOpen", color: "#7C6BBD",
    condition: (s) => s.booksCompleted >= 1, progress: (s) => Math.min(s.booksCompleted, 1) * 100 },
  // Bible
  { id: "bible_first", label: "Primeiro Capítulo", description: "Leia 1 capítulo da Bíblia", category: "bible", icon: "BookMarked", color: "#D4AF37",
    condition: (s) => s.bibleChaptersTotal >= 1, progress: (s) => s.bibleChaptersTotal >= 1 ? 100 : 0 },
  { id: "bible_50", label: "Estudioso", description: "Leia 50 capítulos da Bíblia", category: "bible", icon: "BookMarked", color: "#D4AF37",
    condition: (s) => s.bibleChaptersTotal >= 50, progress: (s) => Math.min((s.bibleChaptersTotal / 50) * 100, 100) },
  // Pomodoro
  { id: "pomo_first", label: "Foco Inicial", description: "Complete 1 pomodoro", category: "pomodoro", icon: "Timer", color: "#D94F4F",
    condition: (s) => s.pomodorosTotal >= 1, progress: (s) => s.pomodorosTotal >= 1 ? 100 : 0 },
  { id: "pomo_100", label: "Mestre do Foco", description: "Complete 100 pomodoros", category: "pomodoro", icon: "Timer", color: "#D94F4F",
    condition: (s) => s.pomodorosTotal >= 100, progress: (s) => Math.min((s.pomodorosTotal / 100) * 100, 100) },
  // XP
  { id: "xp_1000", label: "Estudante Dedicado", description: "Acumule 1000 XP", category: "xp", icon: "Star", color: "#3ABAB4",
    condition: (s) => s.totalXp >= 1000, progress: (s) => Math.min((s.totalXp / 1000) * 100, 100) },
];

export class AchievementService {
  private repo: AchievementRepository;

  constructor(repo?: AchievementRepository) {
    this.repo = repo ?? new AchievementRepository();
  }

  async checkAndUnlock(userId: string, state: AchievementState): Promise<string[]> {
    const unlocked = await this.repo.getUnlocked(userId);
    const unlockedIds = new Set(unlocked.map((a) => a.achievement_id));
    const newlyUnlocked: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) {
        // Update progress even if already unlocked
        const progress = achievement.progress(state);
        await this.repo.upsertAchievement({
          user_id: userId,
          achievement_id: achievement.id,
          progress,
          completed: true,
          unlocked_at: unlocked.find((a) => a.achievement_id === achievement.id)?.unlocked_at ?? new Date().toISOString(),
        });
        continue;
      }

      const progress = achievement.progress(state);
      const completed = achievement.condition(state);

      if (completed) {
        await this.repo.upsertAchievement({
          user_id: userId,
          achievement_id: achievement.id,
          progress: 100,
          completed: true,
          unlocked_at: new Date().toISOString(),
        });
        newlyUnlocked.push(achievement.id);
      } else if (progress > 0) {
        // Update progress for partial completion
        await this.repo.upsertAchievement({
          user_id: userId,
          achievement_id: achievement.id,
          progress,
          completed: false,
        });
      }
    }

    return newlyUnlocked;
  }

  async getUnlocked(userId: string): Promise<UserAchievement[]> {
    return this.repo.getUnlocked(userId);
  }

  async getProgress(userId: string, achievementId: string): Promise<UserAchievement | null> {
    return this.repo.getProgress(userId, achievementId);
  }

  getDefinitions(): AchievementDef[] {
    return ACHIEVEMENTS;
  }
}
