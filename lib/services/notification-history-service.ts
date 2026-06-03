import type { Book, BibleGoal, DailyStats, UserSettings } from "@/lib/supabase";
import { getMotivationalMessage, getBibleVerseOfDay } from "@/lib/ai";

const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://disciplinemax.onrender.com";

export interface UserProgress {
  totalPagesGoal: number;
  totalPagesRead: number;
  booksGoalMet: boolean;
  bibleGoalChapters: number;
  bibleChaptersRead: number;
  bibleGoalMet: boolean;
  pendingBooks: Book[];
  allBooks: Book[];
}

/**
 * Builds notification messages based on user progress.
 * Pure formatting logic — no external calls except AI (verse + motivational).
 */
export class NotificationHistoryService {
  /**
   * Calculate a user's progress from their data.
   */
  static calculateProgress(
    userBooks: Book[],
    bibleGoal: BibleGoal | null,
    stats: DailyStats | null
  ): UserProgress {
    const totalPagesGoal = userBooks.reduce((s, b) => s + b.daily_goal, 0);
    const totalPagesRead = userBooks.reduce((s, b) => s + b.pages_read_today, 0);
    const bibleGoalChapters = bibleGoal?.daily_chapters || 0;
    const bibleChaptersRead = stats?.bible_chapters_read || 0;
    const booksGoalMet = totalPagesRead >= totalPagesGoal;
    const bibleGoalMet = bibleChaptersRead >= bibleGoalChapters;

    return {
      totalPagesGoal,
      totalPagesRead,
      booksGoalMet,
      bibleGoalChapters,
      bibleChaptersRead,
      bibleGoalMet,
      pendingBooks: userBooks.filter((b) => b.pages_read_today < b.daily_goal),
      allBooks: userBooks,
    };
  }

  /**
   * Build the Telegram message for a daily notification.
   */
  static async buildDailyTelegramMessage(
    progress: UserProgress,
    isMorning: boolean,
    brtHour: number
  ): Promise<string> {
    const verse = await getBibleVerseOfDay();
    const motivational = await getMotivationalMessage({
      streak: 0, // Will be filled from stats if available
      booksRead: progress.totalPagesRead,
      bibleChapters: progress.bibleChaptersRead,
      completedToday: progress.booksGoalMet && progress.bibleGoalMet,
    });

    if (isMorning) {
      return NotificationHistoryService.buildMorningMessage(progress, verse, motivational);
    }

    if (progress.booksGoalMet && progress.bibleGoalMet) {
      return NotificationHistoryService.buildCompletionMessage(verse);
    }

    return NotificationHistoryService.buildReminderMessage(progress, brtHour, verse, motivational);
  }

  private static buildMorningMessage(
    progress: UserProgress,
    verse: { verse: string; reference: string },
    motivational: string
  ): string {
    let msg = `☀️ *Bom dia! Hora de buscar o Senhor!*\n\n`;

    if (progress.allBooks.length > 0) {
      msg += `📚 *Metas de leitura hoje:*\n`;
      for (const b of progress.allBooks) {
        const pagesLeft = b.daily_goal - b.pages_read_today;
        msg += `• ${b.title}: ${pagesLeft} páginas\n`;
      }
      msg += `\n`;
    }

    if (progress.bibleGoalChapters > 0) {
      msg += `✝️ *Bíblia:* ${progress.bibleGoalChapters} capítulo(s)\n\n`;
    }

    msg += `📜 _"${verse.verse}"_ — ${verse.reference}\n\n`;
    msg += `💡 _${motivational}_\n\n`;
    msg += `👉 ${APP_URL}`;
    return msg;
  }

  private static buildCompletionMessage(
    verse: { verse: string; reference: string }
  ): string {
    let msg = `🎉 *Parabéns! Você completou todas as metas de hoje!* 🎉\n\n`;
    msg += `📜 _"${verse.verse}"_ — ${verse.reference}\n\n`;
    msg += `💪 Continue firme amanhã!`;
    return msg;
  }

  private static buildReminderMessage(
    progress: UserProgress,
    brtHour: number,
    verse: { verse: string; reference: string },
    motivational: string
  ): string {
    const timeEmoji = brtHour < 18 ? "☀️" : "🌙";
    let msg = `${timeEmoji} *Lembrete — ainda faltam metas hoje!*\n\n`;

    if (progress.pendingBooks.length > 0) {
      msg += `📖 *Livros pendentes:*\n`;
      for (const b of progress.pendingBooks) {
        const pagesLeft = b.daily_goal - b.pages_read_today;
        msg += `• ${b.title}: ${pagesLeft} páginas\n`;
      }
      msg += `\n`;
    }

    if (!progress.bibleGoalMet && progress.bibleGoalChapters > 0) {
      const chaptersLeft = Math.max(0, progress.bibleGoalChapters - progress.bibleChaptersRead);
      msg += `✝️ *Bíblia:* ${chaptersLeft} capítulo(s) restante(s)\n\n`;
    }

    msg += `📜 _"${verse.verse}"_ — ${verse.reference}\n\n`;
    msg += `💪 _${motivational}_\n\n`;
    msg += `👉 ${APP_URL}`;
    return msg;
  }

  /**
   * Build the Push notification body for a daily notification.
   */
  static buildDailyPushPayload(progress: UserProgress): {
    title: string;
    body: string;
    tag: string;
  } {
    if (progress.booksGoalMet && progress.bibleGoalMet) {
      return {
        title: "🎉 Metas cumpridas!",
        body: "Parabéns! Todas as metas de hoje foram cumpridas!",
        tag: "disciplina-reminder",
      };
    }

    const parts: string[] = [];
    if (!progress.booksGoalMet) {
      parts.push(`📚 ${progress.totalPagesGoal - progress.totalPagesRead} páginas`);
    }
    if (!progress.bibleGoalMet) {
      parts.push(`✝️ ${Math.max(0, progress.bibleGoalChapters - progress.bibleChaptersRead)} capítulos`);
    }

    return {
      title: "🎯 Metas pendentes!",
      body: `Metas pendentes! ${parts.join(" · ")}`,
      tag: "disciplina-reminder",
    };
  }

  /**
   * Build the Telegram message for a weekly report.
   */
  static buildWeeklyTelegramMessage(data: {
    totalPages: number;
    booksFinished: number;
    totalChapters: number;
    totalPomodoros: number;
    totalFocusMin: number;
    daysCompleted: number;
    streak: number;
    rating: string;
    activeBooks: Array<{ title: string; progress: number }>;
  }): string {
    let msg = `📊 *Relatório Semanal — DisciplinaMax*\n\n`;
    msg += `📅 Período: última semana\n\n`;
    msg += `📚 *Páginas lidas:* ${data.totalPages}\n`;
    msg += `📖 *Livros concluídos:* ${data.booksFinished}\n`;
    msg += `✝️ *Capítulos bíblicos:* ${data.totalChapters}\n`;
    msg += `🍅 *Pomodoros:* ${data.totalPomodoros} (${data.totalFocusMin} min de foco)\n`;
    msg += `✅ *Dias com metas cumpridas:* ${data.daysCompleted}/7\n\n`;
    msg += `🔥 *Streak atual:* ${data.streak} dias\n\n`;
    msg += `Avaliação da semana: ${data.rating}\n\n`;

    if (data.activeBooks.length > 0) {
      msg += `📖 *Livros em progresso:*\n`;
      for (const b of data.activeBooks.slice(0, 3)) {
        msg += `• ${b.title}: ${b.progress}%\n`;
      }
      msg += `\n`;
    }

    msg += `👉 ${APP_URL}`;
    return msg;
  }

  /**
   * Build the Push notification payload for a weekly report.
   */
  static buildWeeklyPushPayload(data: {
    daysCompleted: number;
    totalPages: number;
    streak: number;
  }): { title: string; body: string; tag: string } {
    return {
      title: "📊 Relatório Semanal",
      body: `${data.daysCompleted}/7 dias cumpridos · ${data.totalPages} págs · 🔥 ${data.streak} dias streak`,
      tag: "disciplina-weekly",
    };
  }

  /**
   * Calculate weekly rating based on days completed.
   */
  static getWeeklyRating(daysCompleted: number): string {
    if (daysCompleted >= 6) return "🌟🌟🌟";
    if (daysCompleted >= 4) return "🌟🌟";
    if (daysCompleted >= 2) return "🌟";
    return "💪 continue firme!";
  }

  /**
   * Calculate streak from recent stats.
   */
  static calculateStreak(recentStats: Array<{ goals_completed: boolean }>): number {
    let streak = 0;
    for (const stat of recentStats) {
      if (stat.goals_completed) streak++;
      else break;
    }
    return streak;
  }
}
