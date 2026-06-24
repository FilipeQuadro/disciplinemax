import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface KairosRequest {
  type: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface KairosResponse {
  content: string;
  agent: string;
  metadata?: Prisma.JsonObject;
}

@Injectable()
export class KairosService {
  private readonly logger = new Logger(KairosService.name);
  private readonly kairosUrl: string;

  constructor(private prisma: PrismaService) {
    this.kairosUrl = process.env.KAIROS_URL || "http://localhost:8000";
  }

  private async callKairos(
    path: string,
    body: Record<string, unknown>,
  ): Promise<KairosResponse> {
    const response = await fetch(`${this.kairosUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(320000),
    });

    if (!response.ok) {
      this.logger.error(
        `Kairos error: ${response.status} ${response.statusText}`,
      );
      throw new Error(`Kairos service unavailable: ${response.status}`);
    }

    return response.json();
  }

  async chat(userId: string, request: KairosRequest): Promise<KairosResponse> {
    const data = await this.callKairos("/api/chat", {
      user_id: userId,
      type: request.type,
      message: request.message,
      context: request.context,
    });

    await this.prisma.kairosInteraction.create({
      data: {
        userId,
        agentType: data.agent,
        messageType: request.type,
        content: data.content,
        metadata: data.metadata ?? {},
      },
    });

    return data;
  }

  async getInsights(userId: string, context?: Record<string, unknown>) {
    return this.callKairos("/api/insights", {
      user_id: userId,
      context,
    });
  }

  async getRecommendations(userId: string, context?: Record<string, unknown>) {
    return this.callKairos("/api/recommendations", {
      user_id: userId,
      context,
    });
  }

  async getInteractions(userId: string, limit = 50) {
    return this.prisma.kairosInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.kairosProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return this.prisma.kairosProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    data: { personality?: string; preferences?: Prisma.JsonObject },
  ) {
    return this.prisma.kairosProfile.upsert({
      where: { userId },
      update: {
        ...(data.personality && { personality: data.personality }),
        ...(data.preferences && { preferences: data.preferences }),
      },
      create: {
        userId,
        personality: data.personality || "encorajador",
        preferences: data.preferences || {},
      },
    });
  }

  async getUserContext(userId: string) {
    const [
      habits,
      books,
      goals,
      streaks,
      bibleReadings,
      pomodoroSessions,
      profile,
    ] = await Promise.all([
      this.prisma.habit.findMany({
        where: { userId },
        include: {
          logs: { orderBy: { date: "desc" }, take: 7 },
        },
      }),
      this.prisma.book.findMany({ where: { userId } }),
      this.prisma.goal.findMany({ where: { userId } }),
      this.prisma.streak.findMany({ where: { userId } }),
      this.prisma.bibleReading.findMany({ where: { userId } }),
      this.prisma.pomodoroSession.findMany({
        where: { userId, isCompleted: true },
      }),
      this.prisma.kairosProfile.findUnique({ where: { userId } }),
    ]);

    const bibleBooks = new Map<string, number>();
    for (const r of bibleReadings) {
      bibleBooks.set(r.book, (bibleBooks.get(r.book) || 0) + 1);
    }

    const totalMinutes = pomodoroSessions.reduce(
      (sum, s) => sum + s.durationMin,
      0,
    );

    const dayMap = new Map<string, number>();
    for (const s of pomodoroSessions) {
      const dayKey = s.startedAt.toISOString().split("T")[0];
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
    }

    return {
      profile: {
        personality: profile?.personality || "encorajador",
        preferences: profile?.preferences || {},
      },
      habits: habits.map((h) => ({
        name: h.name,
        frequency: h.frequency,
        targetCount: h.targetCount,
        logs: h.logs.map((l) => ({
          date: l.date.toISOString(),
          count: l.count,
        })),
      })),
      streaks: streaks.map((s) => ({
        type: s.type,
        currentCount: s.currentCount,
        bestCount: s.bestCount,
      })),
      goals: goals.map((g) => ({
        title: g.title,
        type: g.type,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        isCompleted: g.isCompleted,
        deadline: g.deadline ? g.deadline.toISOString() : null,
      })),
      books: books.map((b) => ({
        title: b.title,
        author: b.author,
        totalPages: b.totalPages,
        pagesRead: b.pagesRead,
        status: b.status,
      })),
      bible: {
        totalChaptersRead: bibleReadings.length,
        books: Object.fromEntries(bibleBooks),
      },
      pomodoro: {
        totalSessions: pomodoroSessions.length,
        totalMinutes,
        averagePerDay:
          dayMap.size > 0
            ? Math.round((pomodoroSessions.length / dayMap.size) * 100) / 100
            : 0,
      },
    };
  }
}
