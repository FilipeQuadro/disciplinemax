import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PomodoroService {
  constructor(private prisma: PrismaService) {}

  createSession(userId: string, data: { durationMin: number; breakMin: number; taskId?: string }) {
    return this.prisma.pomodoroSession.create({
      data: { ...data, userId },
    });
  }

  completeSession(userId: string, id: string) {
    return this.prisma.pomodoroSession.updateMany({
      where: { id, userId },
      data: { isCompleted: true, completedAt: new Date() },
    });
  }

  getSessions(userId: string) {
    return this.prisma.pomodoroSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
    });
  }

  async getStats(userId: string) {
    const sessions = await this.prisma.pomodoroSession.findMany({
      where: { userId, isCompleted: true },
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMin, 0);
    const completedCount = sessions.length;

    const dayMap = new Map<string, number>();
    for (const s of sessions) {
      const dayKey = s.startedAt.toISOString().split("T")[0];
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
    }

    const averagePerDay =
      dayMap.size > 0 ? completedCount / dayMap.size : 0;

    return {
      totalSessions: completedCount,
      totalMinutes,
      averagePerDay: Math.round(averagePerDay * 100) / 100,
    };
  }
}
