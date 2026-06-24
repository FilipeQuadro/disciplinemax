import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.book.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  findOne(userId: string, id: string) {
    return this.prisma.book.findFirst({ where: { id, userId } });
  }

  create(userId: string, data: { title: string; author?: string; totalPages: number; coverUrl?: string }) {
    return this.prisma.book.create({
      data: { ...data, userId },
    });
  }

  async updateProgress(userId: string, id: string, pagesRead: number) {
    const book = await this.prisma.book.findFirst({ where: { id, userId } });
    if (!book) return null;

    const isFinished = pagesRead >= book.totalPages;
    return this.prisma.book.updateMany({
      where: { id, userId },
      data: {
        pagesRead,
        status: isFinished ? "FINISHED" : "READING",
        finishedAt: isFinished ? new Date() : null,
      },
    });
  }

  remove(userId: string, id: string) {
    return this.prisma.book.deleteMany({ where: { id, userId } });
  }

  getStats(userId: string) {
    return this.prisma.book.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    });
  }
}
