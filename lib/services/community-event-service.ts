import { CommunityEventRepository, type CommunityChallenge } from "@/lib/repositories/community-event-repository";

export class CommunityEventService {
  private repo: CommunityEventRepository;

  constructor(repo?: CommunityEventRepository) {
    this.repo = repo ?? new CommunityEventRepository();
  }

  /** Get all active community challenges */
  async getActiveChallenges(): Promise<CommunityChallenge[]> {
    return this.repo.getActiveChallenges();
  }

  /** Get progress for a challenge */
  async getChallengeProgress(challengeId: string): Promise<{ totalContribution: number; participantCount: number; targetValue: number; progressPct: number }> {
    const challenge = await this.getActiveChallenges();
    const match = challenge.find((c) => c.id === challengeId);
    const targetValue = match?.target_value ?? 1;
    const progress = await this.repo.getChallengeProgress(challengeId);

    return {
      ...progress,
      targetValue,
      progressPct: Math.min((progress.totalContribution / targetValue) * 100, 100),
    };
  }

  /** Contribute to a challenge */
  async contribute(challengeId: string, userId: string, amount: number): Promise<boolean> {
    if (amount <= 0) return false;
    const result = await this.repo.contribute(challengeId, userId, amount);
    return !!result;
  }

  /** Get a user's contribution to a specific challenge */
  async getUserContribution(challengeId: string, userId: string): Promise<number> {
    return this.repo.getUserContribution(challengeId, userId);
  }
}
