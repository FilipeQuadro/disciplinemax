import { XpRepository, type UserXp } from "@/lib/repositories/xp-repository";

// XP rewards for various actions
export const XP_REWARDS = {
  POMODORO_COMPLETED: 10,
  PAGE_READ: 2,
  BIBLE_CHAPTER: 5,
  GOAL_COMPLETED: 25,
  STREAK_DAY: 5,
  ACHIEVEMENT_UNLOCKED: 50,
  CHALLENGE_COMPLETED: 30,
  BOOK_FINISHED: 100,
} as const;

export type XpSource = keyof typeof XP_REWARDS;

export class LevelService {
  private xpRepo: XpRepository;

  constructor(xpRepo?: XpRepository) {
    this.xpRepo = xpRepo ?? new XpRepository();
  }

  /** Calculate level from total XP: level = floor(sqrt(totalXp / 100)) + 1 */
  static computeLevel(totalXp: number): number {
    return Math.floor(Math.sqrt(totalXp / 100)) + 1;
  }

  /** XP required to reach a given level: (level-1)^2 * 100 */
  static xpForLevel(level: number): number {
    return (level - 1) * (level - 1) * 100;
  }

  /** XP remaining to next level */
  static xpToNextLevel(totalXp: number): number {
    const level = LevelService.computeLevel(totalXp);
    return LevelService.xpForLevel(level + 1) - totalXp;
  }

  /** Progress percentage through current level (0-100) */
  static levelProgress(totalXp: number): number {
    const level = LevelService.computeLevel(totalXp);
    const currentLevelXp = LevelService.xpForLevel(level);
    const nextLevelXp = LevelService.xpForLevel(level + 1);
    const progress = ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  async addXp(userId: string, amount: number, source: XpSource, sourceId?: string): Promise<UserXp | null> {
    return this.xpRepo.addXp(userId, amount, source, sourceId);
  }

  async getXp(userId: string): Promise<UserXp | null> {
    return this.xpRepo.getXp(userId);
  }

  async getXpHistory(userId: string, limit = 30) {
    return this.xpRepo.getXpHistory(userId, limit);
  }

  /** Convenience: add XP for a pomodoro completion */
  async rewardPomodoro(userId: string): Promise<UserXp | null> {
    return this.addXp(userId, XP_REWARDS.POMODORO_COMPLETED, "POMODORO_COMPLETED");
  }

  /** Convenience: add XP for pages read */
  async rewardPages(userId: string, pages: number): Promise<UserXp | null> {
    return this.addXp(userId, pages * XP_REWARDS.PAGE_READ, "PAGE_READ");
  }

  /** Convenience: add XP for bible chapter */
  async rewardBibleChapter(userId: string): Promise<UserXp | null> {
    return this.addXp(userId, XP_REWARDS.BIBLE_CHAPTER, "BIBLE_CHAPTER");
  }

  /** Convenience: add XP for goal completion */
  async rewardGoalCompleted(userId: string): Promise<UserXp | null> {
    return this.addXp(userId, XP_REWARDS.GOAL_COMPLETED, "GOAL_COMPLETED");
  }

  /** Convenience: add XP for streak day */
  async rewardStreakDay(userId: string): Promise<UserXp | null> {
    return this.addXp(userId, XP_REWARDS.STREAK_DAY, "STREAK_DAY");
  }

  /** Convenience: add XP for achievement unlock */
  async rewardAchievement(userId: string, achievementId: string): Promise<UserXp | null> {
    return this.addXp(userId, XP_REWARDS.ACHIEVEMENT_UNLOCKED, "ACHIEVEMENT_UNLOCKED", achievementId);
  }

  /** Convenience: add XP for challenge completion */
  async rewardChallenge(userId: string, challengeId: string): Promise<UserXp | null> {
    return this.addXp(userId, XP_REWARDS.CHALLENGE_COMPLETED, "CHALLENGE_COMPLETED", challengeId);
  }

  /** Convenience: add XP for book finished */
  async rewardBookFinished(userId: string, bookId: string): Promise<UserXp | null> {
    return this.addXp(userId, XP_REWARDS.BOOK_FINISHED, "BOOK_FINISHED", bookId);
  }
}
