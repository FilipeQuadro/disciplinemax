import { FeedRepository, type FeedEvent } from "@/lib/repositories/feed-repository";
import { FriendshipService } from "@/lib/services/friendship-service";
import { EventTrackingService } from "@/lib/repositories/event-tracking-repository";

export const FEED_EVENT_TYPES = {
  ACHIEVEMENT_UNLOCKED: "achievement_unlocked",
  CHALLENGE_COMPLETED: "challenge_completed",
  STREAK_RECORD: "streak_record",
  BOOK_FINISHED: "book_finished",
} as const;

export type FeedEventType = (typeof FEED_EVENT_TYPES)[keyof typeof FEED_EVENT_TYPES];

export class FeedService {
  private repo: FeedRepository;
  private friendshipService: FriendshipService;
  private eventService: EventTrackingService;

  constructor(repo?: FeedRepository, friendshipService?: FriendshipService, eventService?: EventTrackingService) {
    this.repo = repo ?? new FeedRepository();
    this.friendshipService = friendshipService ?? new FriendshipService();
    this.eventService = eventService ?? new EventTrackingService();
  }

  /** Get feed for a user (friends' events + own) */
  async getFeed(userId: string, limit = 30): Promise<FeedEvent[]> {
    const friendIds = await this.friendshipService.getFriendIds(userId);

    if (friendIds.length === 0) {
      return this.repo.getUserFeed(userId, limit);
    }

    const [friendsFeed, ownFeed] = await Promise.all([
      this.repo.getFriendsFeed(friendIds, limit),
      this.repo.getUserFeed(userId, Math.min(5, limit)),
    ]);

    const all = [...friendsFeed, ...ownFeed];
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all.slice(0, limit);
  }

  /** Track a feed-worthy event */
  async trackEvent(userId: string, eventType: FeedEventType, data: Record<string, unknown> = {}): Promise<void> {
    await this.eventService.track(userId, eventType as any, data).catch(() => {});
  }
}
