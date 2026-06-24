import { Injectable } from "@nestjs/common";
import { HabitFrequency } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HabitsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.habit.findMany({
      where: { userId },
      include: { logs: { orderBy: { date: "desc" }, take: 30 } },
    });
  }

  create(userId: string, data: { name: string; description?: string; icon?: string; color?: string; frequency?: HabitFrequency; targetCount?: number }) {
    return this.prisma.habit.create({
      data: { ...data, userId },
    });
  }

  update(userId: string, id: string, data: Partial<{ name: string; description: string; icon: string; color: string; frequency: HabitFrequency; targetCount: number }>) {
    return this.prisma.habit.updateMany({
      where: { id, userId },
      data,
    });
  }

  remove(userId: string, id: string) {
    return this.prisma.habit.deleteMany({ where: { id, userId } });
  }

  logHabit(userId: string, habitId: string, date: Date, count = 1, note?: string) {
    return this.prisma.habitLog.upsert({
      where: { habitId_date: { habitId, date } },
      create: { habitId, userId, date, count, note },
      update: { count, note },
    });
  }

  getStreak(userId: string) {
    return this.prisma.streak.findMany({ where: { userId } });
  }
}
