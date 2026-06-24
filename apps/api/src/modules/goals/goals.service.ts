import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  create(userId: string, data: { title: string; description?: string; type: string; targetValue: number; deadline?: string }) {
    return this.prisma.goal.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type as any,
        targetValue: data.targetValue,
        deadline: data.deadline ? new Date(data.deadline) : null,
        userId,
      },
    });
  }

  async updateProgress(userId: string, id: string, currentValue: number) {
    const goal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) return null;

    return this.prisma.goal.updateMany({
      where: { id, userId },
      data: {
        currentValue,
        isCompleted: currentValue >= goal.targetValue,
      },
    });
  }

  remove(userId: string, id: string) {
    return this.prisma.goal.deleteMany({ where: { id, userId } });
  }
}
