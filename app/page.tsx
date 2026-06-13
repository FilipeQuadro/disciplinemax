"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { authFetch } from "@/lib/auth-fetch";
import { useStore } from "@/store/useStore";
import { getBibleVerseOfDay, getMotivationalMessage } from "@/lib/ai";
import {
  BookOpen, BookMarked, Timer, Flame, Target, CheckCircle2,
  TrendingUp, Calendar, Zap, ChevronRight, Star, Sparkles, Trophy,
  Share2, ArrowRight, Lightbulb, Lock
} from "lucide-react";
import Link from "next/link";
import { format, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { useAchievements, AchievementNotification } from "@/components/Achievements";
import { SkeletonStats, SkeletonList } from "@/components/Skeleton";
import { ErrorCard } from "@/components/ErrorCard";
import { LevelService } from "@/lib/services/level-service";
import { CHALLENGES } from "@/lib/services/challenge-service";
import { ACHIEVEMENTS } from "@/lib/services/achievement-service";
import { HeroHeader } from "@/components/ui/HeroHeader";
import { GoalBadge } from "@/components/ui/GoalBadge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { GradientCard } from "@/components/ui/GradientCard";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/EmptyState";
import type { DailyStats, Book, BibleReading } from "@/lib/supabase";

// ─── Custom Hook: Dashboard Data ───────────────────────────────────
function useDashboardData() {
  const { user } = useAuth();
  const {
    books, setBooks, streak, setStreak, todayStats, setTodayStats,
    bibleGoal, setBibleGoal, todayBibleChapters, setTodayBibleChapters,
    pomodoroCount, settings, setSettings,
    totalXp, setTotalXp, currentLevel, setCurrentLevel,
  } = useStore();

  const [verse, setVerse] = useState<{ verse: string; reference: string } | null>(null);
  const [motivation, setMotivation] = useState("");
  const [weekStats, setWeekStats] = useState<DayStat[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<ChallengeData[]>([]);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [serverAchievements, setServerAchievements] = useState<AchievementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    if (!user) return;
    try {
      // Try single RPC call first (1 request instead of 10+)
      const rpcOk = await loadViaRpc();
      if (!rpcOk) {
        // Fallback to original multi-fetch approach
        await loadViaDataFetch();
      }

      // Verse + motivation are independent of DB aggregation
      const [v, m] = await Promise.all([
        getBibleVerseOfDay(),
        getMotivationalMessage({
          streak: useStore.getState().streak,
          booksRead: useStore.getState().books.length,
          bibleChapters: useStore.getState().todayBibleChapters,
          completedToday: useStore.getState().todayStats?.goals_completed ?? false,
        }),
      ]);
      setVerse(v);
      setMotivation(m);
    } catch (e) {
      console.error("Dashboard load error:", e);
      setError("Não foi possível carregar os dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }

  /** Attempt to load all dashboard data via single RPC call */
  async function loadViaRpc(): Promise<boolean> {
    try {
      const res = await authFetch(`/api/dashboard?userId=${user!.id}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (!data || data.error) return false;

      // Apply RPC data to store
      if (data.books) setBooks(data.books as any);
      if (data.bibleGoal) setBibleGoal(data.bibleGoal as any);
      else {
        const { data: newGoal } = await dataFetch({ action: "upsert", table: "bible_goals", payload: { user_id: user!.id, daily_chapters: 3, plan_name: "custom" } });
        if (newGoal) setBibleGoal(newGoal as any);
      }
      if (data.settings) setSettings(data.settings as any);
      else {
        const defaultSettings = {
          user_id: user!.id,
          notification_times: ["07:00", "12:00", "19:00"],
          pomodoro_duration: 25, short_break: 5, long_break: 15, pomodoros_until_long: 4,
          daily_books_goal: 20, daily_bible_chapters: 3, timezone: "America/Sao_Paulo",
        };
        const { data: newSettings } = await dataFetch({ action: "upsert", table: "user_settings", payload: defaultSettings });
        if (newSettings) setSettings(newSettings as any);
      }
      if (data.todayStats) setTodayStats(data.todayStats as any);
      if (data.bibleTodayCount !== undefined) setTodayBibleChapters(data.bibleTodayCount as number);
      if (data.streak !== undefined) setStreak(data.streak as number);
      if (data.xp) {
        setTotalXp((data.xp as any).total_xp ?? 0);
        setCurrentLevel((data.xp as any).current_level ?? 1);
      }
      if (data.weekStats) {
        const start = startOfWeek(new Date(), { weekStartsOn: 0 });
        setWeekStats((data.weekStats as any[]).map((w: any, i: number) => ({
          day: w.day || format(addDays(start, i), "EEE", { locale: ptBR }),
          date: w.date || format(addDays(start, i), "yyyy-MM-dd"),
          isToday: w.is_today ?? w.isToday ?? false,
          pages: w.pages ?? 0,
          chapters: w.chapters ?? 0,
          pomodoros: w.pomodoros ?? 0,
        })));
      }
      if (data.calendarData) {
        setCalendarData((data.calendarData as any[]).map((c: any) => ({
          date: c.date,
          done: c.done ?? false,
          partial: c.partial ?? false,
        })));
      }
      if (data.challenges) setActiveChallenges(data.challenges as ChallengeData[]);
      if (data.insights) setInsights(data.insights as InsightData[]);
      if (data.achievements) setServerAchievements(data.achievements as AchievementData[]);

      // Auto-heal: reset books pages_read_today if no today stats
      if (!data.todayStats && (data.books as any[])?.some((b: any) => b.pages_read_today > 0)) {
        const resetBooks = (data.books as any[]).map((b: any) => ({ ...b, pages_read_today: 0 }));
        setBooks(resetBooks as any);
      }

      return true;
    } catch {
      return false;
    }
  }

  /** Original multi-fetch approach as fallback */
  async function loadViaDataFetch() {
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Phase 1: Parallel independent fetches
    const [booksRes, bibleGoalRes, settingsRes, statsRes, bibleReadingsRes] = await Promise.all([
      dataFetch({ action: "select", table: "books", filters: { eq: { user_id: user!.id }, order: { column: "created_at", ascending: true } } }),
      dataFetch({ action: "select", table: "bible_goals", filters: { eq: { user_id: user!.id }, maybeSingle: true } }),
      dataFetch({ action: "select", table: "user_settings", filters: { eq: { user_id: user!.id }, maybeSingle: true } }),
      dataFetch({ action: "select", table: "daily_stats", filters: { eq: { user_id: user!.id, date: todayStr }, maybeSingle: true } }),
      dataFetch({ action: "select", table: "bible_readings", filters: { eq: { user_id: user!.id }, gte: { read_at: todayStr }, select: "id" } }),
    ]);

    // Phase 2: Process books
    if (booksRes.data) {
      const needsReset = !statsRes.data && (booksRes.data as any[]).some((b: any) => b.pages_read_today > 0);
      if (needsReset) {
        const resetBooks = (booksRes.data as any[]).map((b: any) => ({ ...b, pages_read_today: 0 }));
        setBooks(resetBooks as any);
      } else {
        setBooks(booksRes.data as any[]);
      }
    }

    if (bibleGoalRes.data) {
      setBibleGoal(bibleGoalRes.data as any);
    } else {
      const { data: newGoal } = await dataFetch({ action: "upsert", table: "bible_goals", payload: { user_id: user!.id, daily_chapters: 3, plan_name: "custom" } });
      if (newGoal) setBibleGoal(newGoal as any);
    }
    if (settingsRes.data) {
      setSettings(settingsRes.data as any);
    } else {
      const defaultSettings = {
        user_id: user!.id,
        notification_times: ["07:00", "12:00", "19:00"],
        pomodoro_duration: 25, short_break: 5, long_break: 15, pomodoros_until_long: 4,
        daily_books_goal: 20, daily_bible_chapters: 3, timezone: "America/Sao_Paulo",
      };
      const { data: newSettings } = await dataFetch({ action: "upsert", table: "user_settings", payload: defaultSettings });
      if (newSettings) setSettings(newSettings as any);
    }
    if (statsRes.data) setTodayStats(statsRes.data as any);
    setTodayBibleChapters((bibleReadingsRes.data as any[])?.length ?? 0);

    // Phase 3: Streak
    const recentStatsRes = await dataFetch<any[]>({ action: "select", table: "daily_stats", filters: { eq: { user_id: user!.id }, order: { column: "date", ascending: false }, limit: 30, select: "date, goals_completed" } });
    let newStreak = 0;
    if (recentStatsRes.data) {
      for (const stat of recentStatsRes.data as any[]) {
        if (stat.goals_completed) newStreak++;
        else break;
      }
    }
    setStreak(newStreak);

    // Phase 4: Week stats + calendar
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    const startStr = format(start, "yyyy-MM-dd");
    const calendarStart = format(addDays(new Date(), -34), "yyyy-MM-dd");

    const [weekDataRes, calendarRes] = await Promise.all([
      dataFetch<any[]>({ action: "select", table: "daily_stats", filters: { eq: { user_id: user!.id }, gte: { date: startStr }, order: { column: "date", ascending: true } } }),
      dataFetch<{ date: string; goals_completed: boolean; books_pages_read: number; bible_chapters_read: number; pomodoros_completed: number }[]>({
        action: "select", table: "daily_stats",
        filters: { eq: { user_id: user!.id }, gte: { date: calendarStart }, select: "date, goals_completed, books_pages_read, bible_chapters_read, pomodoros_completed" }
      }),
    ]);

      if (weekDataRes.data) {
        setWeekStats(Array.from({ length: 7 }, (_, i) => {
          const d = addDays(start, i);
          const dateStr = format(d, "yyyy-MM-dd");
          const stat = weekDataRes.data!.find((s: any) => s.date === dateStr);
          return {
            day: format(d, "EEE", { locale: ptBR }),
            date: dateStr,
            isToday: dateStr === todayStr,
            pages: stat?.books_pages_read || 0,
            chapters: stat?.bible_chapters_read || 0,
            pomodoros: stat?.pomodoros_completed || 0,
          };
        }));
      }

      if (calendarRes.data) {
        const statsMap = new Map(calendarRes.data.map(s => [s.date, s]));
        setCalendarData(Array.from({ length: 35 }, (_, i) => {
          const d = addDays(new Date(), -34 + i);
          const dateStr = format(d, "yyyy-MM-dd");
          const stat = statsMap.get(dateStr);
          return { date: dateStr, done: stat?.goals_completed || false, partial: !!stat && !stat.goals_completed };
        }));
      }

      // Phase 5: Gamification data (XP, challenges, insights, server achievements)
      const [xpRes, chalRes, insRes, achRes] = await Promise.all([
        dataFetch({ action: "select", table: "user_xp", filters: { eq: { user_id: user!.id }, maybeSingle: true } }),
        dataFetch({ action: "select", table: "user_challenges", filters: { eq: { user_id: user!.id }, select: "challenge_id,progress,target,completed,xp_reward,week_key" } }),
        dataFetch({ action: "select", table: "user_insights", filters: { eq: { user_id: user!.id }, order: { column: "created_at", ascending: false }, limit: 3 } }),
        dataFetch({ action: "select", table: "user_achievements", filters: { eq: { user_id: user!.id } } }),
      ]);

      if (xpRes.data) {
        const xp = xpRes.data as { total_xp: number; current_level: number };
        setTotalXp(xp.total_xp);
        setCurrentLevel(xp.current_level);
      }
      if (chalRes.data) setActiveChallenges((chalRes.data as ChallengeData[]).filter((c) => !c.completed));
      if (insRes.data) setInsights(insRes.data as InsightData[]);
      if (achRes.data) setServerAchievements(achRes.data as AchievementData[]);
  }

  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadAllRef.current();
  }, [user]);

  return { books, streak, todayStats, bibleGoal, todayBibleChapters, pomodoroCount, settings, verse, motivation, weekStats, calendarData, totalXp, currentLevel, activeChallenges, insights, serverAchievements, loading, error, user };
}

// ─── Types ──────────────────────────────────────────────────────────
interface DayStat {
  day: string;
  date: string;
  isToday: boolean;
  pages: number;
  chapters: number;
  pomodoros: number;
}

interface CalendarDay {
  date: string;
  done: boolean;
  partial: boolean;
}

interface ChallengeData {
  challenge_id: string;
  progress: number;
  target: number;
  completed: boolean;
  xp_reward: number;
  week_key: string;
}

interface InsightData {
  insight_type: string;
  message: string;
  created_at: string;
}

interface AchievementData {
  achievement_id: string;
  progress: number;
  completed: boolean;
  unlocked_at: string | null;
}

// ─── Main Component ─────────────────────────────────────────────────
export default function DashboardPage() {
  const data = useDashboardData();
  const { books, streak, bibleGoal, todayBibleChapters, pomodoroCount, settings, verse, motivation, weekStats, calendarData, totalXp, currentLevel, activeChallenges, insights, serverAchievements, loading, error, user } = data;
  const [mounted, setMounted] = useState(false);
  const achievements = useAchievements();
  const checkAndUnlockRef = useRef(achievements.checkAndUnlock);
  checkAndUnlockRef.current = achievements.checkAndUnlock;

  useEffect(() => { setMounted(true); }, []);

  // Check achievements after data loads
  useEffect(() => {
    if (!loading) {
      const booksCompleted = books.filter((b) => b.current_page >= b.total_pages).length;
      checkAndUnlockRef.current({
        streak,
        booksCompleted,
        bibleChaptersTotal: todayBibleChapters,
        pomodorosTotal: pomodoroCount,
        totalPagesRead: books.reduce((sum, b) => sum + b.current_page, 0),
      });
    }
  }, [loading, streak, books, todayBibleChapters, pomodoroCount]);

  // ─── Computed Values ────────────────────────────────────────────
  const totalPagesGoal = books.reduce((sum, b) => sum + b.daily_goal, 0);
  const pagesReadToday = books.reduce((sum, b) => sum + b.pages_read_today, 0);
  const bibleGoalMet = bibleGoal ? todayBibleChapters >= bibleGoal.daily_chapters : false;
  const pomodoroGoal = settings?.pomodoros_until_long ?? 4;
  const allGoalsMet = pagesReadToday >= totalPagesGoal && bibleGoalMet;

  const bookProgress = totalPagesGoal > 0 ? (pagesReadToday / totalPagesGoal) * 100 : 0;
  const bibleProgress = bibleGoal ? (todayBibleChapters / bibleGoal.daily_chapters) * 100 : 0;
  const pomodoroProgress = (pomodoroCount / pomodoroGoal) * 100;

  // Overall daily completion (equal weight for each active goal)
  const activeGoals = [totalPagesGoal > 0, !!bibleGoal, true]; // pomodoro always active
  const overallProgress = activeGoals.filter(Boolean).length > 0
    ? [bookProgress, bibleProgress, pomodoroProgress].filter((_, i) => activeGoals[i]).reduce((a, b) => a + b, 0) / activeGoals.filter(Boolean).length
    : 0;

  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Leitor";

  // What's next — contextual CTA
  const nextAction = useMemo(() => {
    if (allGoalsMet) return { label: "Parabéns! Metas concluídas 🎉", href: "", icon: CheckCircle2, color: "var(--accent-teal)" };
    if (pagesReadToday < totalPagesGoal) return { label: "Registrar leitura", href: "/livros", icon: BookOpen, color: "var(--accent-purple)" };
    if (!bibleGoalMet) return { label: "Ler a Bíblia", href: "/biblia", icon: BookMarked, color: "var(--gold)" };
    return { label: "Iniciar Pomodoro", href: "/pomodoro", icon: Timer, color: "var(--danger)" };
  }, [allGoalsMet, pagesReadToday, totalPagesGoal, bibleGoalMet]);

  function shareProgress() {
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://disciplinemax.onrender.com";
    const bibleStatus = bibleGoal ? `${todayBibleChapters}/${bibleGoal.daily_chapters} cap.` : "✓";
    const text = `🔥 DisciplinaMax — Meu progresso hoje!\n\n📚 ${pagesReadToday}/${totalPagesGoal} páginas\n✝️ Bíblia: ${bibleStatus}\n🍅 ${pomodoroCount} pomodoros\n🔥 ${streak} dias de streak\n\n👉 ${appUrl}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "DisciplinaMax — Progresso", text }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast.success("Copiado! 📋")).catch(() => {});
    }
  }

  // ─── Loading Skeleton ───────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-3 w-48 rounded bg-white/5 mb-2" />
            <div className="h-7 w-64 rounded bg-white/5" />
          </div>
          <div className="h-9 w-32 rounded-xl bg-white/5" />
        </div>
        <SkeletonStats count={4} />
        <SkeletonList count={3} />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <HeroHeader
          title={`Olá, ${userName}! 👋`}
          showDate
        />
        <ErrorCard onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────
  return (
    <div className="space-y-8 page-enter">
      {/* Hero Header */}
      <div className="flex items-start justify-between">
        <HeroHeader
          title={`${getGreeting()}, ${userName}! 👋`}
          showDate
        />
        <div className="flex items-center gap-2">
          <button onClick={shareProgress} className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors duration-200 hover:bg-white/5 glass"
            aria-label="Compartilhar progresso">
            <Share2 size={14} style={{ color: "var(--text-secondary)" }} />
          </button>
          {allGoalsMet ? (
            <GoalBadge met={true} metLabel="Tudo feito!" />
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}>
              <Target size={16} style={{ color: "var(--gold)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--gold)" }}>Em andamento</span>
            </div>
          )}
        </div>
      </div>

      {/* Versículo do dia */}
      {verse && (
        <GradientCard variant="gold" className="relative overflow-hidden shimmer">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5" style={{ color: "var(--gold)" }}>
              <Star size={11} /> Versículo do Dia
            </p>
            <p className="text-white font-serif italic text-lg leading-relaxed">&ldquo;{verse.verse}&rdquo;</p>
            <p className="mt-2 text-sm font-medium" style={{ color: "rgba(212,175,55,0.6)" }}>— {verse.reference}</p>
          </div>
        </GradientCard>
      )}

      {/* Motivação da IA */}
      {motivation && (
        <div className="rounded-2xl p-4 flex items-start gap-3 glow-border glass">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #D4AF37, #F5D060)", boxShadow: "0 4px 20px rgba(212,175,55,0.15)" }}>
            <Sparkles size={16} className="text-[#0B0E14]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: "var(--gold)" }}>
              <Zap size={10} /> IA Motivacional
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#C8CCD4" }}>{motivation}</p>
          </div>
        </div>
      )}

      {/* Streak Hero */}
      <div className="relative rounded-2xl overflow-hidden p-6 md:p-8"
        style={{
          background: "linear-gradient(135deg, rgba(232,132,74,0.08), rgba(20,24,32,0.95))",
          border: "1px solid rgba(232,132,74,0.12)",
          boxShadow: "0 0 40px rgba(232,132,74,0.06), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(232,132,74,0.12) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="relative flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(232,132,74,0.2), rgba(232,132,74,0.05))" }}>
            <Flame size={40} style={{ color: "var(--warning)" }} className={streak > 0 ? "animate-pulse" : ""} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-5xl font-semibold tracking-tight text-white">{streak}<span className="text-lg font-normal ml-2" style={{ color: "var(--text-muted)" }}>dias seguidos</span></p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{streak === 0 ? "Comece sua streak hoje!" : streak < 7 ? "Continue firme! A consistência constrói hábitos." : streak < 30 ? "Uma semana+ de dedicação! 🔥" : "Você é imparável! 💪"}</p>
          </div>
          {streak >= 7 && (
            <Badge variant="streak">🔥 {streak}d</Badge>
          )}
        </div>
      </div>

      {/* What's Next — Primary CTA */}
      {!allGoalsMet && (
        <Link href={nextAction.href} className="group relative block rounded-2xl p-5 md:p-6 transition-all duration-300 hover:scale-[1.005]"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(20,24,32,0.95))",
            border: "1px solid rgba(212,175,55,0.15)",
            boxShadow: "0 0 60px rgba(212,175,55,0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #F5D060)",
                boxShadow: "0 4px 24px rgba(212,175,55,0.2)",
              }}>
              <nextAction.icon size={24} className="text-[#0B0E14]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: "var(--gold)" }}>Próximo passo</p>
              <p className="text-xl font-semibold tracking-tight text-white">{nextAction.label}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-white/5"
              style={{ border: "1px solid rgba(212,175,55,0.15)" }}>
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-0.5" style={{ color: "var(--gold)" }} />
            </div>
          </div>
        </Link>
      )}

      {/* Daily Progress Ring + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Ring */}
        <div className="md:col-span-1 card flex flex-col items-center justify-center py-6">
          <ProgressRing value={overallProgress} max={100} size={140} strokeWidth={8} color="var(--gold)" trackColor="rgba(255,255,255,0.03)">
            <div className="flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tracking-tight text-white">{Math.round(overallProgress)}%</span>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Hoje</span>
            </div>
          </ProgressRing>
          <div className="flex items-center gap-4 mt-4">
            <MiniProgress label="Livros" pct={bookProgress} color="var(--accent-purple)" />
            <MiniProgress label="Bíblia" pct={bibleProgress} color="var(--gold)" />
            <MiniProgress label="Foco" pct={pomodoroProgress} color="var(--danger)" />
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="md:col-span-2 grid grid-cols-3 gap-3">
          <QuickAction href="/livros" icon={<BookOpen size={20} />} label="Registrar" sub="Leitura" color="#7C6BBD" done={bookProgress >= 100} />
          <QuickAction href="/biblia" icon={<BookMarked size={20} />} label="Ler" sub="Bíblia" color="#D4AF37" done={bibleGoalMet} />
          <QuickAction href="/pomodoro" icon={<Timer size={20} />} label="Iniciar" sub="Foco" color="#D94F4F" done={pomodoroCount >= pomodoroGoal} />
        </div>
      </div>

      {/* XP & Level Banner */}
      <GradientCard variant="gold" className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(212,175,55,0.12)" }}>
            <Star size={22} style={{ color: "var(--gold)" }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold tracking-tight text-white">Nível {currentLevel}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{totalXp.toLocaleString()} XP</p>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${LevelService.levelProgress(totalXp)}%`, background: "linear-gradient(90deg, #A8892B, #D4AF37)" }} />
            </div>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>{LevelService.xpToNextLevel(totalXp)} XP para o próximo nível</p>
          </div>
          <Link href="/progresso" className="shrink-0 p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--gold)" }}>
            <ChevronRight size={16} />
          </Link>
        </div>
      </GradientCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard
          icon={Flame}
          label="Streak"
          value={`${streak}`}
          color="var(--warning)"
          className="card-orange"
        />
        <StatCard
          icon={BookOpen}
          label="Páginas Hoje"
          value={`${pagesReadToday}/${totalPagesGoal}`}
          color="var(--accent-purple)"
          className="card-purple"
        />
        <StatCard
          icon={BookMarked}
          label="Bíblia Hoje"
          value={`${todayBibleChapters}/${bibleGoal?.daily_chapters ?? 0}`}
          color="var(--gold)"
          className="card-gold"
        />
        <StatCard
          icon={Timer}
          label="Pomodoros"
          value={`${pomodoroCount}/${pomodoroGoal}`}
          color="var(--danger)"
          className="card-red"
        />
      </div>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold tracking-tight text-white flex items-center gap-2">
              <Target size={16} style={{ color: "var(--accent-teal)" }} />
              Desafios da Semana
            </h2>
            <Link href="/progresso" className="text-xs flex items-center gap-1 transition-colors" style={{ color: "var(--accent-teal)" }}>
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 stagger-children">
            {activeChallenges.slice(0, 3).map((challenge) => {
              const def = CHALLENGES.find((d) => d.id === challenge.challenge_id);
              const pct = Math.min((challenge.progress / challenge.target) * 100, 100);
              return (
                <GradientCard key={challenge.challenge_id} variant="teal" className="p-3 glow-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-white">{def?.label ?? challenge.challenge_id}</p>
                    <Badge variant="level">+{challenge.xp_reward} XP</Badge>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "var(--accent-teal)" }} />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>{Math.floor(challenge.progress)}/{challenge.target}</p>
                </GradientCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Livros em andamento */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold tracking-tight text-white flex items-center gap-2">
            <BookOpen size={16} style={{ color: "var(--accent-purple)" }} />
            Livros em Leitura
          </h2>
          <Link href="/livros" className="text-xs flex items-center gap-1 transition-colors" style={{ color: "var(--gold)" }}>
            Ver todos <ChevronRight size={12} />
          </Link>
        </div>
        {books.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            iconColor="var(--text-secondary)"
            title="Nenhum livro cadastrado"
            description="Adicione seu primeiro livro para começar a acompanhar suas leituras."
            primaryAction={{ label: "Adicionar Livro", href: "/livros" }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
            {books.slice(0, 4).map((book) => (
              <BookMiniCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>

      {/* Gráfico da semana */}
      {weekStats.length > 0 && (
        <div className="card shimmer">
          <h2 className="font-semibold tracking-tight text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "var(--gold)" }} />
            Progresso da Semana
          </h2>
          <div className="space-y-2">
            {weekStats.map((d, i) => {
              const maxPages = Math.max(...weekStats.map((w) => w.pages || 0), 1);
              const maxChapters = Math.max(...weekStats.map((w) => w.chapters || 0), 1);
              const maxPomodoros = Math.max(...weekStats.map((w) => w.pomodoros || 0), 1);
              return (
                <div key={i} className={clsx(
                  "flex items-center gap-3 py-1.5 px-3 rounded-xl transition-all duration-200",
                  d.isToday && "ring-1 ring-inset"
                )}
                style={{
                  background: d.isToday ? "rgba(212,175,55,0.04)" : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                  ...(d.isToday ? { ringColor: "rgba(212,175,55,0.15)" } : {}),
                }}>
                  <span className={clsx("text-xs font-medium w-8 text-right", d.isToday && "font-bold")} style={{ color: d.isToday ? "var(--gold)" : "var(--text-muted)" }}>{d.day}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-10 text-right" style={{ color: "var(--accent-purple)" }}>Pág</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(124,107,189,0.08)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((d.pages || 0) / maxPages) * 100}%`, background: "linear-gradient(90deg, #7C6BBD, #9B8FD4)" }} />
                      </div>
                      <span className="text-[10px] w-6 text-right" style={{ color: "var(--text-muted)" }}>{d.pages || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-10 text-right" style={{ color: "var(--gold)" }}>Cap</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(212,175,55,0.08)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((d.chapters || 0) / maxChapters) * 100}%`, background: "linear-gradient(90deg, #A8892B, #D4AF37)" }} />
                      </div>
                      <span className="text-[10px] w-6 text-right" style={{ color: "var(--text-muted)" }}>{d.chapters || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-10 text-right" style={{ color: "var(--danger)" }}>🍅</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(217,79,79,0.08)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((d.pomodoros || 0) / maxPomodoros) * 100}%`, background: "linear-gradient(90deg, #B83E3E, #D94F4F)" }} />
                      </div>
                      <span className="text-[10px] w-6 text-right" style={{ color: "var(--text-muted)" }}>{d.pomodoros || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: "var(--accent-purple)" }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--accent-purple)" }} /> Páginas
            </span>
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: "var(--gold)" }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--gold)" }} /> Capítulos
            </span>
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: "var(--danger)" }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--danger)" }} /> Pomodoros
            </span>
          </div>
        </div>
      )}

      {/* Calendário de consistência */}
      <ConsistencyCalendar data={calendarData} />

      {/* Conquistas */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold tracking-tight text-white flex items-center gap-2">
            <Trophy size={16} style={{ color: "var(--gold)" }} />
            Conquistas
          </h2>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {serverAchievements.filter((a) => a.completed).length}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
          {ACHIEVEMENTS.map((ach) => {
            const userAch = serverAchievements.find((a) => a.achievement_id === ach.id);
            const unlocked = userAch?.completed ?? false;
            const progress = userAch?.progress ?? 0;
            return (
              <div
                key={ach.id}
                title={unlocked ? `${ach.label}: ${ach.description}` : progress > 0 ? `${ach.label} (${Math.round(progress)}%)` : "???"}
                className="rounded-xl p-2 flex flex-col items-center justify-center transition-all duration-300 cursor-default"
                style={{
                  background: unlocked ? `${ach.color}12` : "rgba(255,255,255,0.01)",
                  border: unlocked ? `1px solid ${ach.color}25` : "1px solid rgba(255,255,255,0.03)",
                  opacity: unlocked ? 1 : progress > 0 ? 0.6 : 0.3,
                }}
              >
                {unlocked ? (
                  <Trophy size={16} style={{ color: ach.color }} />
                ) : (
                  <Lock size={12} style={{ color: "var(--text-secondary)" }} />
                )}
                <p className="text-[8px] mt-1 text-center" style={{ color: unlocked ? ach.color : "var(--text-secondary)" }}>
                  {unlocked ? ach.label : "???"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="card">
          <h2 className="font-semibold tracking-tight text-white mb-3 flex items-center gap-2">
            <Lightbulb size={16} style={{ color: "var(--accent-purple)" }} />
            Insights
          </h2>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="p-3 rounded-xl flex items-start gap-2" style={{ background: "rgba(124,107,189,0.05)" }}>
                <TrendingUp size={14} className="shrink-0 mt-0.5" style={{ color: "var(--accent-purple)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ins.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <AchievementNotification badgeKey={achievements.newBadge} />
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function MiniProgress({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="text-center">
      <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center mb-1"
        style={{ background: `${color}12` }}>
        <span className="text-[11px] font-semibold" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</span>
    </div>
  );
}

function QuickAction({ href, icon, label, sub, color, done }: { href: string; icon: React.ReactNode; label: string; sub: string; color: string; done: boolean }) {
  return (
    <Link href={href} className="group relative rounded-2xl p-4 flex flex-col items-center gap-2 transition-all duration-300 hover:scale-[1.03] glow-border"
      style={{ background: `linear-gradient(145deg, ${color}08, rgba(20,24,32,0.8))`, border: `1px solid ${color}18` }}>
      {done && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "var(--accent-teal)" }}>
          <CheckCircle2 size={12} className="text-white" />
        </div>
      )}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{sub}</p>
      </div>
    </Link>
  );
}

function BookMiniCard({ book }: { book: any }) {
  const progress = Math.round((book.current_page / book.total_pages) * 100);
  const pagesLeft = book.daily_goal - book.pages_read_today;
  const done = pagesLeft <= 0;

  return (
    <div className={clsx(
      "rounded-2xl p-4 transition-all duration-300 hover:scale-[1.01] glow-border",
      done ? "card-teal" : "glass"
    )}
    style={!done ? { borderLeft: `3px solid ${book.color}30` } : {}}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{book.title}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{book.current_page}/{book.total_pages} pgs</p>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative"
          style={{ background: `${book.color}12` }}>
          <ProgressRing value={book.current_page} max={book.total_pages} size={36} strokeWidth={3} color={book.color} trackColor="rgba(255,255,255,0.04)">
            <span className="text-[10px] font-bold" style={{ color: book.color }}>{progress}%</span>
          </ProgressRing>
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%`, background: done ? "var(--accent-teal)" : book.color }} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Hoje: {book.pages_read_today}/{book.daily_goal} pgs
        </span>
        {done ? (
          <Badge variant="premium">✓ Feito</Badge>
        ) : (
          <span className="badge" style={{ background: "rgba(232,132,74,0.12)", color: "var(--warning)" }}>{pagesLeft} faltam</span>
        )}
      </div>
    </div>
  );
}

function ConsistencyCalendar({ data }: { data: CalendarDay[] }) {
  const COLS = 7;
  const [focusedIdx, setFocusedIdx] = useState(0);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  const moveFocus = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, data.length - 1));
    setFocusedIdx(clamped);
    cellRefs.current[clamped]?.focus();
  }, [data.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next = focusedIdx;
    switch (e.key) {
      case "ArrowRight": next = focusedIdx + 1; break;
      case "ArrowLeft":  next = focusedIdx - 1; break;
      case "ArrowDown":  next = focusedIdx + COLS; break;
      case "ArrowUp":    next = focusedIdx - COLS; break;
      case "Home":       next = 0; break;
      case "End":        next = data.length - 1; break;
      default: return;
    }
    e.preventDefault();
    moveFocus(next);
  }, [focusedIdx, data.length, moveFocus]);

  return (
    <div className="card">
      <h2 className="font-semibold tracking-tight text-white mb-4 flex items-center gap-2">
        <Calendar size={16} style={{ color: "var(--gold)" }} />
        Calendário de Consistência
      </h2>
      <div className="flex flex-wrap gap-1.5" role="grid" aria-label="Calendário de consistência — últimos 35 dias" onKeyDown={handleKeyDown}>
        {data.map((d, i) => {
          const dateLabel = format(new Date(d.date + "T12:00:00"), "dd/MM");
          const statusLabel = d.done ? "Meta cumprida" : d.partial ? "Parcial" : "Sem registro";
          const isFocused = i === focusedIdx;
          return (
          <div key={i} className="relative group" role="row">
            <div
              ref={(el) => { cellRefs.current[i] = el; }}
              role="gridcell"
              aria-label={`${dateLabel} — ${statusLabel}`}
              tabIndex={isFocused ? 0 : -1}
              onFocus={() => setFocusedIdx(i)}
              className={clsx(
                "w-7 h-7 rounded-md transition-all duration-200 cursor-default",
                isFocused && "ring-2 ring-[var(--gold)] ring-offset-1 ring-offset-[#141820]"
              )}
              style={{
                background: d.done
                  ? "rgba(212,175,55,0.5)"
                  : d.partial
                    ? "rgba(212,175,55,0.12)"
                    : "rgba(255,255,255,0.02)",
                boxShadow: d.done ? "0 0 8px rgba(212,175,55,0.15)" : "none",
              }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
              style={{ background: "#1a1f2e", color: "#C8CCD4", border: "1px solid rgba(255,255,255,0.08)" }}>
              {dateLabel}
            </div>
          </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: "rgba(212,175,55,0.5)" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Meta cumprida</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: "rgba(212,175,55,0.12)" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Parcial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: "rgba(255,255,255,0.02)" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Sem registro</span>
        </div>
      </div>
    </div>
  );
}
