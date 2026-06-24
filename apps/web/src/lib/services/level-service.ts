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

/** Calculate level from total XP: level = floor(sqrt(totalXp / 100)) + 1 */
export function computeLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

/** XP required to reach a given level: (level-1)^2 * 100 */
export function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 100;
}

/** XP remaining to next level */
export function xpToNextLevel(totalXp: number): number {
  const level = computeLevel(totalXp);
  return xpForLevel(level + 1) - totalXp;
}

/** Progress percentage through current level (0-100) */
export function levelProgress(totalXp: number): number {
  const level = computeLevel(totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progress = ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.max(0, Math.min(100, progress));
}
