import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BibleService {
  constructor(private prisma: PrismaService) {}

  getReadings(userId: string) {
    return this.prisma.bibleReading.findMany({
      where: { userId },
      orderBy: { readAt: "desc" },
    });
  }

  recordReading(userId: string, book: string, chapter: number, planId?: string) {
    return this.prisma.bibleReading.create({
      data: { userId, book, chapter, planId },
    });
  }

  removeReading(userId: string, id: string) {
    return this.prisma.bibleReading.deleteMany({ where: { id, userId } });
  }

  getPlans() {
    return this.prisma.bibleReadingPlan.findMany();
  }

  async getProgress(userId: string) {
    const readings = await this.prisma.bibleReading.findMany({
      where: { userId },
    });

    const books = new Map<string, number>();
    for (const r of readings) {
      books.set(r.book, (books.get(r.book) || 0) + 1);
    }

    return {
      totalChaptersRead: readings.length,
      books: Object.fromEntries(books),
    };
  }
}
