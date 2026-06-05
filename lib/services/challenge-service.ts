import { ChallengeRepository, type UserChallenge } from "@/lib/repositories/challenge-repository";
import { XpRepository } from "@/lib/repositories/xp-repository";

export interface ChallengeDef {
  id: string;
  label: string;
  description: string;
  target: number;
  xpReward: number;
  icon: string;
  color: string;
  trackProgress: (state: ChallengeState) => number;
}

export interface ChallengeState {
  streak: number;
  pomodorosThisWeek: number;
  pagesThisWeek: number;
  bibleChaptersThisWeek: number;
  goalsCompletedThisWeek: number;
  booksCompletedThisWeek: number;
}

// 12 challenges (3 assigned per week, rotating)
export const CHALLENGES: ChallengeDef[] = [
  { id: "streak_7", label: "7 Dias Seguidos", description: "Mantenha a streak por 7 dias", target: 7, xpReward: 30, icon: "Flame", color: "#E8844A",
    trackProgress: (s) => s.streak },
  { id: "pomo_10", label: "10 Pomodoros", description: "Complete 10 pomodoros esta semana", target: 10, xpReward: 25, icon: "Timer", color: "#D94F4F",
    trackProgress: (s) => s.pomodorosThisWeek },
  { id: "pages_50", label: "50 Páginas", description: "Leia 50 páginas esta semana", target: 50, xpReward: 25, icon: "BookOpen", color: "#7C6BBD",
    trackProgress: (s) => s.pagesThisWeek },
  { id: "pages_100", label: "100 Páginas", description: "Leia 100 páginas esta semana", target: 100, xpReward: 40, icon: "BookOpen", color: "#7C6BBD",
    trackProgress: (s) => s.pagesThisWeek },
  { id: "bible_7", label: "7 Capítulos", description: "Leia 7 capítulos da Bíblia esta semana", target: 7, xpReward: 25, icon: "BookMarked", color: "#D4AF37",
    trackProgress: (s) => s.bibleChaptersThisWeek },
  { id: "goals_5", label: "5 Metas Cumpridas", description: "Complete metas em 5 dias esta semana", target: 5, xpReward: 30, icon: "Target", color: "#3ABAB4",
    trackProgress: (s) => s.goalsCompletedThisWeek },
  { id: "book_finish", label: "Conclua um Livro", description: "Termine um livro esta semana", target: 1, xpReward: 50, icon: "BookOpen", color: "#7C6BBD",
    trackProgress: (s) => s.booksCompletedThisWeek },
  { id: "pomo_25", label: "25 Pomodoros", description: "Complete 25 pomodoros esta semana", target: 25, xpReward: 50, icon: "Timer", color: "#D94F4F",
    trackProgress: (s) => s.pomodorosThisWeek },
  { id: "streak_3", label: "3 Dias Seguidos", description: "Mantenha a streak por 3 dias", target: 3, xpReward: 20, icon: "Flame", color: "#E8844A",
    trackProgress: (s) => s.streak },
  { id: "bible_14", label: "14 Capítulos", description: "Leia 14 capítulos da Bíblia esta semana", target: 14, xpReward: 40, icon: "BookMarked", color: "#D4AF37",
    trackProgress: (s) => s.bibleChaptersThisWeek },
  { id: "goals_7", label: "Semana Perfeita", description: "Complete metas todos os 7 dias", target: 7, xpReward: 60, icon: "Star", color: "#D4AF37",
    trackProgress: (s) => s.goalsCompletedThisWeek },
  { id: "pomo_5", label: "5 Pomodoros", description: "Complete 5 pomodoros esta semana", target: 5, xpReward: 15, icon: "Timer", color: "#D94F4F",
    trackProgress: (s) => s.pomodorosThisWeek },
];

export class ChallengeService {
  private repo: ChallengeRepository;
  private xpRepo: XpRepository;

  constructor(repo?: ChallengeRepository, xpRepo?: XpRepository) {
    this.repo = repo ?? new ChallengeRepository();
    this.xpRepo = xpRepo ?? new XpRepository();
  }

  /** Get current week key in YYYY-Www format */
  static getWeekKey(date?: Date): string {
    const d = date ?? new Date();
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  /** Assign 3 weekly challenges for a user (rotating based on week number) */
  async assignWeekly(userId: string): Promise<UserChallenge[]> {
    const weekKey = ChallengeService.getWeekKey();
    const weekNum = parseInt(weekKey.split("-W")[1], 10);

    // Pick 3 challenges rotating by week number
    const indices = [
      weekNum % CHALLENGES.length,
      (weekNum + 4) % CHALLENGES.length,
      (weekNum + 8) % CHALLENGES.length,
    ];
    const selected = indices.map((i) => CHALLENGES[i]);

    const results: UserChallenge[] = [];
    for (const challenge of selected) {
      const entry = await this.repo.upsertChallenge({
        user_id: userId,
        challenge_id: challenge.id,
        target: challenge.target,
        xp_reward: challenge.xpReward,
        week_key: weekKey,
      });
      if (entry) results.push(entry);
    }
    return results;
  }

  /** Check and update challenge progress */
  async checkProgress(userId: string, state: ChallengeState): Promise<UserChallenge[]> {
    const weekKey = ChallengeService.getWeekKey();
    const active = await this.repo.getActive(userId);
    const updated: UserChallenge[] = [];

    for (const challenge of active) {
      if (challenge.week_key !== weekKey) continue;

      const def = CHALLENGES.find((c) => c.id === challenge.challenge_id);
      if (!def) continue;

      const progress = def.trackProgress(state);
      const completed = progress >= challenge.target;

      const result = await this.repo.updateProgress(
        userId,
        challenge.challenge_id,
        challenge.week_key,
        Math.min(progress, challenge.target),
        completed,
      );

      if (result) {
        updated.push(result);

        // Award XP on completion
        if (completed && !challenge.completed) {
          await this.xpRepo.addXp(userId, challenge.xp_reward, "CHALLENGE_COMPLETED", challenge.challenge_id);
        }
      }
    }

    return updated;
  }

  async getActiveChallenges(userId: string): Promise<UserChallenge[]> {
    return this.repo.getActive(userId);
  }

  async getCompletedChallenges(userId: string, limit = 30): Promise<UserChallenge[]> {
    return this.repo.getCompleted(userId, limit);
  }

  getDefinitions(): ChallengeDef[] {
    return CHALLENGES;
  }
}
