import { FriendshipRepository, type Friendship } from "@/lib/repositories/friendship-repository";
import { EventTrackingService } from "@/lib/repositories/event-tracking-repository";

export class FriendshipService {
  private repo: FriendshipRepository;
  private eventService: EventTrackingService;

  constructor(repo?: FriendshipRepository, eventService?: EventTrackingService) {
    this.repo = repo ?? new FriendshipRepository();
    this.eventService = eventService ?? new EventTrackingService();
  }

  async sendRequest(requesterId: string, addresseeId: string): Promise<Friendship | null> {
    const existing = await this.repo.getFriendship(requesterId, addresseeId);
    if (existing) return null;

    const result = await this.repo.sendRequest(requesterId, addresseeId);
    if (result) {
      await this.eventService.track(requesterId, "friend_request_sent" as any, { addressee_id: addresseeId }).catch(() => {});
    }
    return result;
  }

  async acceptRequest(requesterId: string, addresseeId: string): Promise<Friendship | null> {
    const result = await this.repo.acceptRequest(requesterId, addresseeId);
    if (result) {
      await this.eventService.track(addresseeId, "friend_request_accepted" as any, { requester_id: requesterId }).catch(() => {});
    }
    return result;
  }

  async removeFriend(userId1: string, userId2: string): Promise<boolean> {
    return this.repo.removeFriend(userId1, userId2);
  }

  async getFriends(userId: string): Promise<Friendship[]> {
    return this.repo.getFriends(userId);
  }

  async getPendingRequests(userId: string): Promise<Friendship[]> {
    return this.repo.getPendingRequests(userId);
  }

  async getFriendCount(userId: string): Promise<number> {
    return this.repo.getFriendCount(userId);
  }

  /** Get friend user IDs */
  async getFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.getFriends(userId);
    return friendships.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );
  }
}
