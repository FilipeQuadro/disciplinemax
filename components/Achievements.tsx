"use client";

import { useEffect, useState, useCallback } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { Trophy, Flame, BookOpen, BookMarked, Timer, Lock } from "lucide-react";
import { clsx } from "clsx";

export interface Badge {
  key: string;
  label: string;
  description: string;
  icon: typeof Trophy;
  color: string;
  condition: (state: BadgeState) => boolean;
}

export interface BadgeState {
  streak: number;
  booksCompleted: number;
  bibleChaptersTotal: number;
  pomodorosTotal: number;
  totalPagesRead: number;
}

export const BADGES: Badge[] = [
  // Streak
  { key: "streak_3", label: "Início Firme", description: "3 dias seguidos", icon: Flame, color: "#E8844A",
    condition: (s) => s.streak >= 3 },
  { key: "streak_7", label: "Uma Semana!", description: "7 dias seguidos", icon: Flame, color: "#D4AF37",
    condition: (s) => s.streak >= 7 },
  { key: "streak_30", label: "Mês Completo", description: "30 dias seguidos", icon: Flame, color: "#D4AF37",
    condition: (s) => s.streak >= 30 },
  { key: "streak_100", label: "Lendário", description: "100 dias seguidos", icon: Flame, color: "#D4AF37",
    condition: (s) => s.streak >= 100 },
  // Books
  { key: "book_first", label: "Primeira Página", description: "Comece seu primeiro livro", icon: BookOpen, color: "#7C6BBD",
    condition: (s) => s.totalPagesRead > 0 },
  { key: "book_complete", label: "Concluído!", description: "Termine um livro", icon: BookOpen, color: "#7C6BBD",
    condition: (s) => s.booksCompleted >= 1 },
  { key: "books_3", label: "Trilogia", description: "Termine 3 livros", icon: BookOpen, color: "#7C6BBD",
    condition: (s) => s.booksCompleted >= 3 },
  // Bible
  { key: "bible_first", label: "Primeiro Capítulo", description: "Leia 1 capítulo da Bíblia", icon: BookMarked, color: "#D4AF37",
    condition: (s) => s.bibleChaptersTotal >= 1 },
  { key: "bible_50", label: "Estudioso", description: "Leia 50 capítulos da Bíblia", icon: BookMarked, color: "#D4AF37",
    condition: (s) => s.bibleChaptersTotal >= 50 },
  { key: "bible_365", label: "Um Ano na Palavra", description: "Leia 365 capítulos da Bíblia", icon: BookMarked, color: "#D4AF37",
    condition: (s) => s.bibleChaptersTotal >= 365 },
  // Pomodoro
  { key: "pomo_first", label: "Foco Inicial", description: "Complete 1 pomodoro", icon: Timer, color: "#D94F4F",
    condition: (s) => s.pomodorosTotal >= 1 },
  { key: "pomo_25", label: "Maratonista", description: "Complete 25 pomodoros", icon: Timer, color: "#D94F4F",
    condition: (s) => s.pomodorosTotal >= 25 },
  { key: "pomo_100", label: "Mestre do Foco", description: "Complete 100 pomodoros", icon: Timer, color: "#D94F4F",
    condition: (s) => s.pomodorosTotal >= 100 },
];

export function useAchievements() {
  const streak = useStore((s) => s.streak);
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [newBadge, setNewBadge] = useState<string | null>(null);

  const loadUnlocked = useCallback(async () => {
    if (!user) return;
    const { data } = await dataFetch({ action: "select", table: "achievements", filters: { eq: { user_id: user.id }, select: "badge_key" } });
    if (data) setUnlocked((data as any[]).map((d: any) => d.badge_key));
  }, [user]);

  useEffect(() => {
    loadUnlocked();
  }, [loadUnlocked]);

  async function checkAndUnlock(state: BadgeState) {
    if (!user) return;
    const newUnlocks: string[] = [];

    for (const badge of BADGES) {
      if (unlocked.includes(badge.key)) continue;
      if (badge.condition(state)) {
        const { error } = await dataFetch({ action: "insert", table: "achievements", payload: {
          user_id: user.id,
          badge_key: badge.key,
        }});
        if (!error) {
          newUnlocks.push(badge.key);
          setNewBadge(badge.key);
          setTimeout(() => setNewBadge(null), 4000);
        }
      }
    }

    if (newUnlocks.length > 0) {
      setUnlocked((prev) => [...prev, ...newUnlocks]);
    }
  }

  return { unlocked, newBadge, checkAndUnlock, loadUnlocked };
}

export function AchievementGrid({ unlocked, compact }: { unlocked: string[]; compact?: boolean }) {
  return (
    <div className={clsx("grid gap-3", compact ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5")}>
      {BADGES.map((badge) => {
        const isUnlocked = unlocked.includes(badge.key);
        const Icon = badge.icon;
        return (
          <div
            key={badge.key}
            title={isUnlocked ? `${badge.label}: ${badge.description}` : "??? — continue praticando para desbloquear"}
            className={clsx(
              "rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-default",
              compact ? "p-2.5" : "p-4"
            )}
            style={{
              background: isUnlocked ? `linear-gradient(145deg, ${badge.color}12, ${badge.color}06)` : "rgba(255,255,255,0.01)",
              border: isUnlocked ? `1px solid ${badge.color}25` : "1px solid rgba(255,255,255,0.03)",
              opacity: isUnlocked ? 1 : 0.4,
            }}
          >
            <div
              className={clsx("rounded-lg flex items-center justify-center", compact ? "w-8 h-8" : "w-10 h-10")}
              style={{ background: isUnlocked ? `${badge.color}18` : "rgba(255,255,255,0.03)" }}
            >
              {isUnlocked ? (
                <Icon size={compact ? 16 : 20} style={{ color: badge.color }} />
              ) : (
                <Lock size={compact ? 14 : 16} style={{ color: "#555E6E" }} />
              )}
            </div>
            {!compact && (
              <p className="text-[10px] mt-2 text-center font-medium" style={{ color: isUnlocked ? badge.color : "#555E6E" }}>
                {isUnlocked ? badge.label : "???"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AchievementNotification({ badgeKey }: { badgeKey: string | null }) {
  if (!badgeKey) return null;
  const badge = BADGES.find((b) => b.key === badgeKey);
  if (!badge) return null;
  const Icon = badge.icon;

  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-up"
      style={{
        background: `linear-gradient(145deg, ${badge.color}15, rgba(20,24,32,0.95))`,
        border: `1px solid ${badge.color}30`,
        borderRadius: "16px",
        padding: "16px 20px",
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 30px ${badge.color}15`,
        maxWidth: "300px",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${badge.color}20` }}>
          <Icon size={20} style={{ color: badge.color }} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: badge.color }}>
            🏆 Conquista desbloqueada!
          </p>
          <p className="text-sm font-bold text-white">{badge.label}</p>
          <p className="text-xs" style={{ color: "#8B95A5" }}>{badge.description}</p>
        </div>
      </div>
    </div>
  );
}
