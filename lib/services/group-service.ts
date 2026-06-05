import { GroupRepository, type Group } from "@/lib/repositories/group-repository";

export class GroupService {
  private repo: GroupRepository;

  constructor(repo?: GroupRepository) {
    this.repo = repo ?? new GroupRepository();
  }

  async listGroups(): Promise<Group[]> {
    return this.repo.listGroups();
  }

  async joinGroup(groupId: string, userId: string): Promise<boolean> {
    const result = await this.repo.joinGroup(groupId, userId);
    return !!result;
  }

  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    return this.repo.leaveGroup(groupId, userId);
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    return this.repo.getUserGroups(userId);
  }

  async getGroupRanking(groupId: string) {
    return this.repo.getGroupRanking(groupId);
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    return this.repo.isMember(groupId, userId);
  }
}
