// Repository layer — all Supabase access goes through here.
// No business logic accesses Supabase directly.

export { SettingsRepository } from "./settings-repository";
export { UserRepository } from "./user-repository";
export { NotificationRepository } from "./notification-repository";
export { SubscriptionRepository } from "./subscription-repository";
export { NotificationQueueRepository, RetryService } from "./notification-queue-repository";
export { StreakRepository, type UserStreak } from "./streak-repository";
export { AchievementRepository, type UserAchievement } from "./achievement-repository";
export { XpRepository, type UserXp, type XpEvent } from "./xp-repository";
export { ChallengeRepository, type UserChallenge } from "./challenge-repository";
export { InsightRepository, type UserInsight } from "./insight-repository";
export { ProfileRepository, type UserProfile } from "./profile-repository";
export { FriendshipRepository, type Friendship } from "./friendship-repository";
export { FeedRepository, type FeedEvent } from "./feed-repository";
export { LeaderboardRepository, type LeaderboardEntry } from "./leaderboard-repository";
export { ReferralRepository, type Referral } from "./referral-repository";
export { GroupRepository, type Group, type GroupMember } from "./group-repository";
export { CommunityEventRepository, type CommunityChallenge, type CommunityChallengeProgress } from "./community-event-repository";
export { OnboardingRepository, type OnboardingProgress } from "./onboarding-repository";
export { DashboardRepository, type DashboardData } from "./dashboard-repository";
