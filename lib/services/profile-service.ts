import { ProfileRepository, type UserProfile } from "@/lib/repositories/profile-repository";

export class ProfileService {
  private repo: ProfileRepository;

  constructor(repo?: ProfileRepository) {
    this.repo = repo ?? new ProfileRepository();
  }

  /** Get a user's profile */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.repo.getProfile(userId);
  }

  /** Get a public profile by username */
  async getPublicProfile(username: string): Promise<UserProfile | null> {
    return this.repo.getByUsername(username);
  }

  /** Create or update a user profile */
  async upsertProfile(userId: string, updates: Partial<Pick<UserProfile, "username" | "display_name" | "bio" | "is_public">>): Promise<UserProfile | null> {
    if (updates.username) {
      updates.username = updates.username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
      if (updates.username.length < 3) return null;

      const existing = await this.repo.usernameExists(updates.username);
      const current = await this.repo.getProfile(userId);
      if (existing && current?.username !== updates.username) return null;
    }

    return this.repo.upsertProfile({ user_id: userId, ...updates });
  }

  /** Ensure a profile exists for a user, creating one if needed */
  async ensureProfile(userId: string, displayName?: string): Promise<UserProfile | null> {
    const existing = await this.repo.getProfile(userId);
    if (existing) return existing;

    const referralCode = await this.generateReferralCode(userId);
    return this.repo.upsertProfile({
      user_id: userId,
      display_name: displayName ?? null,
      referral_code: referralCode,
    });
  }

  /** Generate a unique referral code based on user ID */
  async generateReferralCode(userId: string): Promise<string> {
    const base = userId.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${base}${suffix}`;

    const existing = await this.repo.getByReferralCode(code);
    if (existing) {
      return this.generateReferralCode(userId);
    }

    return code;
  }

  /** Sync profile stats from gamification data */
  async syncStats(userId: string): Promise<UserProfile | null> {
    try {
      const stats = await this.repo.getAggregatedStats(userId);
      return this.repo.updateStats(userId, {
        books_completed: stats.booksCompleted,
        total_pages: stats.totalPages,
        pomodoros_total: stats.pomodorosTotal,
        bible_chapters_total: stats.bibleChaptersTotal,
      });
    } catch {
      return null;
    }
  }
}
