import { ReferralRepository, type Referral } from "@/lib/repositories/referral-repository";
import { ProfileRepository } from "@/lib/repositories/profile-repository";
import { XpRepository } from "@/lib/repositories/xp-repository";
import { AchievementRepository } from "@/lib/repositories/achievement-repository";
import { EventTrackingService } from "@/lib/repositories/event-tracking-repository";
import { XP_REWARDS } from "@/lib/services/level-service";

export const REFERRAL_XP_BONUS = 100;
export const REFERRAL_ACHIEVEMENT_ID = "referral_first";

export class ReferralService {
  private repo: ReferralRepository;
  private profileRepo: ProfileRepository;
  private xpRepo: XpRepository;
  private achievementRepo: AchievementRepository;
  private eventService: EventTrackingService;

  constructor(
    repo?: ReferralRepository,
    profileRepo?: ProfileRepository,
    xpRepo?: XpRepository,
    achievementRepo?: AchievementRepository,
    eventService?: EventTrackingService,
  ) {
    this.repo = repo ?? new ReferralRepository();
    this.profileRepo = profileRepo ?? new ProfileRepository();
    this.xpRepo = xpRepo ?? new XpRepository();
    this.achievementRepo = achievementRepo ?? new AchievementRepository();
    this.eventService = eventService ?? new EventTrackingService();
  }

  /** Get the referral code for a user */
  async getReferralCode(userId: string): Promise<string | null> {
    const profile = await this.profileRepo.getProfile(userId);
    return profile?.referral_code ?? null;
  }

  /** Track a referral — called when a new user signs up with a code */
  async trackReferral(inviteeId: string, code: string): Promise<Referral | null> {
    const referrerProfile = await this.profileRepo.getByReferralCode(code);
    if (!referrerProfile) return null;
    if (referrerProfile.user_id === inviteeId) return null;

    // Check for duplicate
    const existing = await this.repo.getReferralByInvitee(inviteeId);
    if (existing) return null;

    const referral = await this.repo.createReferral(referrerProfile.user_id, inviteeId, code);
    if (!referral) return null;

    // Award XP bonus to both referrer and invitee
    await Promise.all([
      this.xpRepo.addXp(referrerProfile.user_id, REFERRAL_XP_BONUS, "ACHIEVEMENT_UNLOCKED", REFERRAL_ACHIEVEMENT_ID).catch(() => {}),
      this.xpRepo.addXp(inviteeId, REFERRAL_XP_BONUS, "ACHIEVEMENT_UNLOCKED", "referral_joined").catch(() => {}),
    ]);

    // Unlock referral achievement for referrer
    await this.achievementRepo.upsertAchievement({
      user_id: referrerProfile.user_id,
      achievement_id: REFERRAL_ACHIEVEMENT_ID,
      progress: 100,
      completed: true,
      unlocked_at: new Date().toISOString(),
    }).catch(() => {});

    // Track events
    await Promise.all([
      this.eventService.track(referrerProfile.user_id, "referral_completed" as any, { invitee_id: inviteeId }).catch(() => {}),
      this.eventService.track(inviteeId, "referral_joined" as any, { referrer_id: referrerProfile.user_id }).catch(() => {}),
    ]);

    return referral;
  }

  /** Get all referrals made by a user */
  async getReferrals(userId: string): Promise<Referral[]> {
    return this.repo.getReferralsByReferrer(userId);
  }

  /** Get the count of referrals made by a user */
  async getReferralCount(userId: string): Promise<number> {
    return this.repo.getReferralCount(userId);
  }
}
