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
      const { getServiceClient } = await import("@/lib/db-client");
      const client = getServiceClient();

      const [booksRes, pomodoroRes, bibleRes] = await Promise.all([
        client.from("books").select("current_page, total_pages").eq("user_id", userId),
        client.from("pomodoro_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
        client.from("bible_readings").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      const books = (booksRes.data as Array<{ current_page: number; total_pages: number }>) ?? [];
      const totalPages = books.reduce((s, b) => s + b.current_page, 0);
      const booksCompleted = books.filter((b) => b.current_page >= b.total_pages).length;

      return this.repo.updateStats(userId, {
        books_completed: booksCompleted,
        total_pages: totalPages,
        pomodoros_total: pomodoroRes.count ?? 0,
        bible_chapters_total: bibleRes.count ?? 0,
      });
    } catch {
      return null;
    }
  }
}
