import { toast } from "react-hot-toast";
import { authFetch } from "@/lib/auth-fetch";

const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://disciplinemax.onrender.com";

interface ShareData {
  title: string;
  text: string;
  url?: string;
}

export function shareProgress(
  streak: number,
  pagesReadToday: number,
  totalPagesGoal: number,
  pomodoroCount: number,
  bibleChapters: number,
  level: number,
): void {
  const text = `🔥 DisciplinaMax — Meu progresso!\n\n📚 ${pagesReadToday}/${totalPagesGoal} páginas\n✝️ ${bibleChapters} capítulos da Bíblia\n🍅 ${pomodoroCount} pomodoros\n🔥 ${streak} dias de streak\n⭐ Nível ${level}\n\n👉 ${APP_URL}`;

  doShare({ title: "DisciplinaMax — Progresso", text });
}

export function shareProfile(username: string, displayName: string, level: number, streak: number): void {
  const text = `⭐ ${displayName} no DisciplinaMax!\n\n🔥 ${streak} dias de streak\n⭐ Nível ${level}\n\n👉 ${APP_URL}/u/${username}`;

  doShare({ title: "DisciplinaMax — Perfil", text, url: `${APP_URL}/u/${username}` });
}

export function shareAchievement(achievementLabel: string, achievementDescription: string): void {
  const text = `🏆 Conquista desbloqueada!\n\n${achievementLabel}: ${achievementDescription}\n\n👉 ${APP_URL}`;

  doShare({ title: "DisciplinaMax — Conquista!", text });
}

export function shareStreak(streak: number): void {
  const text = `🔥 ${streak} dias de streak no DisciplinaMax!\n\nConsistência é tudo! 💪\n\n👉 ${APP_URL}`;

  doShare({ title: `${streak} dias de streak!`, text });
}

export function shareLevel(level: number, totalXp: number): void {
  const text = `⭐ Nível ${level} alcançado no DisciplinaMax!\n\n${totalXp.toLocaleString()} XP total 🎯\n\n👉 ${APP_URL}`;

  doShare({ title: `Nível ${level}!`, text });
}

function doShare(data: ShareData): void {
  // Track sharing event (fire-and-forget)
  authFetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shareType: data.title, data: { text: data.text } }),
  }).catch(() => {});

  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share(data).catch(() => {});
  } else if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(data.text)
      .then(() => toast.success("Copiado! 📋"))
      .catch(() => {});
  }
}
