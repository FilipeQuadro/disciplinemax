import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  async getLevel(userId: string) {
    let level = await this.prisma.userLevel.findUnique({ where: { userId } });
    if (!level) {
      level = await this.prisma.userLevel.create({ data: { userId } });
    }
    return level;
  }

  async addXp(userId: string, xpAmount: number) {
    const current = await this.getLevel(userId);
    const newTotalXp = current.xp + xpAmount;
    const newLevel = Math.floor(newTotalXp / 100) + 1;

    return this.prisma.userLevel.update({
      where: { userId },
      data: { xp: newTotalXp, level: newLevel },
    });
  }

  getAchievements(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });
  }

  getAvailableAchievements(userId: string) {
    return this.prisma.achievement.findMany({
      where: {
        NOT: {
          users: { some: { userId } },
        },
      },
    });
  }
}
