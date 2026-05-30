"use client";

import { useEffect, useState, useMemo } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { getBibleVerseOfDay, getMotivationalMessage } from "@/lib/ai";
import {
  BookOpen, BookMarked, Timer, Flame, Target, CheckCircle2,
  TrendingUp, Calendar, Zap, ChevronRight, Star, Sparkles, Trophy,
  Share2, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { format, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { useAchievements, AchievementGrid, AchievementNotification } from "@/components/Achievements";

// ─── Custom Hook: Dashboard Data ───────────────────────────────────
function useDashboardData() {
  const { user } = useAuth();
  const {
    books, setBooks, streak, setStreak, todayStats, setTodayStats,
    bibleGoal, setBibleGoal, todayBibleChapters, setTodayBibleChapters,
    pomodoroCount, settings, setSettings,
  } = useStore();

  const [verse, setVerse] = useState<{ verse: string; reference: string } | null>(null);
  const [motivation, setMotivation] = useState("");
  const [weekStats, setWeekStats] = useState<DayStat[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadAll();
  }, [user]);

  async function loadAll() {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    try {
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
          for (const b of booksRes.data as any[]) {
            if (b.pages_read_today > 0) {
              await dataFetch({ action: "update", table: "books", id: b.id, payload: { pages_read_today: 0 } });
            }
          }
        } else {
          setBooks(booksRes.data as any[]);
        }
      }

      // Phase 2b: Auto-heal
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

      // Phase 3: Streak + verse + motivation (depends on prior data)
      const recentStatsRes = await dataFetch<any[]>({ action: "select", table: "daily_stats", filters: { eq: { user_id: user!.id }, order: { column: "date", ascending: false }, limit: 30, select: "date, goals_completed" } });
      let newStreak = 0;
      if (recentStatsRes.data) {
        for (const stat of recentStatsRes.data as any[]) {
          if (stat.goals_completed) newStreak++;
          else break;
        }
      }
      setStreak(newStreak);

      const [v, m] = await Promise.all([
        getBibleVerseOfDay(),
        getMotivationalMessage({
          streak: newStreak,
          booksRead: booksRes.data?.length ?? books.length,
          bibleChapters: bibleReadingsRes.data?.length ?? todayBibleChapters,
          completedToday: (statsRes.data as any)?.goals_completed ?? false,
        }),
      ]);
      setVerse(v);
      setMotivation(m);

      // Phase 4: Week stats + calendar (parallel — both need daily_stats range)
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
    } catch (e) {
      console.error("Dashboard load error:", e);
      toast.error("Erro ao carregar dados. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  return { books, streak, todayStats, bibleGoal, todayBibleChapters, pomodoroCount, settings, verse, motivation, weekStats, calendarData, loading, user };
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

// ─── Main Component ─────────────────────────────────────────────────
export default function DashboardPage() {
  const data = useDashboardData();
  const { books, streak, bibleGoal, todayBibleChapters, pomodoroCount, settings, verse, motivation, weekStats, calendarData, loading, user } = data;
  const [mounted, setMounted] = useState(false);
  const achievements = useAchievements();
  const today = new Date();

  useEffect(() => { setMounted(true); }, []);

  // Check achievements after data loads
  useEffect(() => {
    if (!loading) {
      const booksCompleted = books.filter((b) => b.current_page >= b.total_pages).length;
      achievements.checkAndUnlock({
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
    if (allGoalsMet) return { label: "Parabéns! Metas concluídas 🎉", href: "", icon: CheckCircle2, color: "#3ABAB4" };
    if (pagesReadToday < totalPagesGoal) return { label: "Registrar leitura", href: "/livros", icon: BookOpen, color: "#7C6BBD" };
    if (!bibleGoalMet) return { label: "Ler a Bíblia", href: "/biblia", icon: BookMarked, color: "#D4AF37" };
    return { label: "Iniciar Pomodoro", href: "/pomodoro", icon: Timer, color: "#D94F4F" };
  }, [allGoalsMet, pagesReadToday, totalPagesGoal, bibleGoalMet]);

  function shareProgress() {
    const bibleStatus = bibleGoal ? `${todayBibleChapters}/${bibleGoal.daily_chapters} cap.` : "✓";
    const text = `🔥 DisciplinaMax — Meu progresso hoje!\n\n📚 ${pagesReadToday}/${totalPagesGoal} páginas\n✝️ Bíblia: ${bibleStatus}\n🍅 ${pomodoroCount} pomodoros\n🔥 ${streak} dias de streak\n\n👉 disciplinemax.onrender.com`;
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
        <div className="flex justify-center">
          <div className="h-44 w-44 rounded-full bg-white/[0.02]" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-white/[0.02]" />)}
        </div>
        <div className="h-32 rounded-2xl bg-white/[0.02]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-white/[0.02]" />)}
        </div>
        <div className="h-48 rounded-xl bg-white/[0.02]" />
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6 page-enter">
      {/* Hero Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs mb-1" style={{ color: "#555E6E" }}>
            {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <h1 className="text-2xl font-serif font-bold text-white">
            {getGreeting()}, <span className="gradient-text-gold">{userName}!</span> 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={shareProgress} className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <Share2 size={14} style={{ color: "#555E6E" }} />
          </button>
          {allGoalsMet ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl pulse-glow"
              style={{ background: "rgba(58,186,180,0.08)", border: "1px solid rgba(58,186,180,0.15)" }}>
              <CheckCircle2 size={16} style={{ color: "#3ABAB4" }} />
              <span className="text-sm font-medium" style={{ color: "#3ABAB4" }}>Tudo feito!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}>
              <Target size={16} style={{ color: "#D4AF37" }} />
              <span className="text-sm font-medium" style={{ color: "#D4AF37" }}>Em andamento</span>
            </div>
          )}
        </div>
      </div>

      {/* Daily Progress Ring + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Ring */}
        <div className="md:col-span-1 card flex flex-col items-center justify-center py-6">
          <div className="relative">
            <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
              <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
              <circle cx="70" cy="70" r="58" fill="none" stroke="url(#progressGrad)" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={`${58 * 2 * Math.PI}`}
                strokeDashoffset={`${58 * 2 * Math.PI * (1 - Math.min(1, overallProgress / 100))}`}
                className="transition-all duration-1000 ease-out" />
              <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#F5D060" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{Math.round(overallProgress)}%</span>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Hoje</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <MiniProgress label="Livros" pct={bookProgress} color="#7C6BBD" />
            <MiniProgress label="Bíblia" pct={bibleProgress} color="#D4AF37" />
            <MiniProgress label="Foco" pct={pomodoroProgress} color="#D94F4F" />
          </div>
        </div>

        {/* Quick Actions + Streak */}
        <div className="md:col-span-2 grid grid-cols-1 gap-3">
          {/* Streak Banner */}
          <div className="card-orange rounded-2xl p-4 flex items-center gap-4 shimmer" style={{ border: "1px solid rgba(232,132,74,0.15)" }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(232,132,74,0.15), rgba(232,132,74,0.05))" }}>
              <Flame size={28} style={{ color: "#E8844A" }} className={streak > 0 ? "animate-pulse" : ""} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-white">{streak}<span className="text-sm font-normal ml-1" style={{ color: "#8B95A5" }}>dias</span></p>
              <p className="text-xs" style={{ color: "#555E6E" }}>{streak === 0 ? "Comece sua streak hoje!" : streak < 7 ? "Continue firme! A consistência constrói hábitos." : streak < 30 ? "Uma semana+ de dedicação! 🔥" : "Você é imparável! 💪"}</p>
            </div>
            {streak >= 7 && (
              <div className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(232,132,74,0.12)", color: "#E8844A" }}>
                🔥 {streak}d
              </div>
            )}
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-3 gap-3">
            <QuickAction href="/livros" icon={<BookOpen size={20} />} label="Registrar" sub="Leitura" color="#7C6BBD" done={bookProgress >= 100} />
            <QuickAction href="/biblia" icon={<BookMarked size={20} />} label="Ler" sub="Bíblia" color="#D4AF37" done={bibleGoalMet} />
            <QuickAction href="/pomodoro" icon={<Timer size={20} />} label="Iniciar" sub="Foco" color="#D94F4F" done={pomodoroCount >= pomodoroGoal} />
          </div>

          {/* What's Next CTA */}
          {!allGoalsMet && (
            <Link href={nextAction.href} className="group flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.06), rgba(20,24,32,0.9))", border: "1px solid rgba(212,175,55,0.12)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #D4AF37, #F5D060)", boxShadow: "0 4px 20px rgba(212,175,55,0.15)" }}>
                <nextAction.icon size={18} className="text-[#0B0E14]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{nextAction.label}</p>
                <p className="text-xs" style={{ color: "#555E6E" }}>Próximo passo para completar o dia</p>
              </div>
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" style={{ color: "#D4AF37" }} />
            </Link>
          )}
        </div>
      </div>

      {/* Versículo do dia */}
      {verse && (
        <div className="rounded-2xl p-5 relative overflow-hidden shimmer"
          style={{
            background: "linear-gradient(145deg, rgba(212,175,55,0.06) 0%, rgba(20,24,32,0.9) 60%, rgba(124,107,189,0.04) 100%)",
            border: "1px solid rgba(212,175,55,0.15)",
          }}
        >
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5" style={{ color: "#D4AF37" }}>
              <Star size={11} /> Versículo do Dia
            </p>
            <p className="text-white font-serif italic text-lg leading-relaxed">&ldquo;{verse.verse}&rdquo;</p>
            <p className="mt-2 text-sm font-medium" style={{ color: "rgba(212,175,55,0.6)" }}>— {verse.reference}</p>
          </div>
        </div>
      )}

      {/* Motivação da IA */}
      {motivation && (
        <div className="rounded-2xl p-4 flex items-start gap-3 glow-border"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #D4AF37, #F5D060)", boxShadow: "0 4px 20px rgba(212,175,55,0.15)" }}>
            <Sparkles size={16} className="text-[#0B0E14]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: "#D4AF37" }}>
              <Zap size={10} /> IA Motivacional
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#C8CCD4" }}>{motivation}</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard
          icon={<Flame size={18} style={{ color: "#E8844A" }} />}
          label="Streak"
          value={`${streak}`}
          sub="dias consecutivos"
          cardClass="card-orange"
          iconBg="rgba(232,132,74,0.12)"
        />
        <StatCard
          icon={<BookOpen size={18} style={{ color: "#7C6BBD" }} />}
          label="Páginas Hoje"
          value={`${pagesReadToday}/${totalPagesGoal}`}
          sub={`de ${books.length} livros`}
          cardClass="card-purple"
          iconBg="rgba(124,107,189,0.12)"
          progress={totalPagesGoal > 0 ? (pagesReadToday / totalPagesGoal) * 100 : 0}
          progressColor="#7C6BBD"
        />
        <StatCard
          icon={<BookMarked size={18} style={{ color: "#D4AF37" }} />}
          label="Bíblia Hoje"
          value={`${todayBibleChapters}/${bibleGoal?.daily_chapters ?? 0}`}
          sub="capítulos"
          cardClass="card-gold"
          iconBg="rgba(212,175,55,0.12)"
          progress={bibleGoal ? (todayBibleChapters / bibleGoal.daily_chapters) * 100 : 0}
          progressColor="#D4AF37"
        />
        <StatCard
          icon={<Timer size={18} style={{ color: "#D94F4F" }} />}
          label="Pomodoros"
          value={`${pomodoroCount}/${pomodoroGoal}`}
          sub="sessões de foco"
          cardClass="card-red"
          iconBg="rgba(217,79,79,0.12)"
          progress={(pomodoroCount / pomodoroGoal) * 100}
          progressColor="#D94F4F"
        />
      </div>

      {/* Livros em andamento */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <BookOpen size={16} style={{ color: "#7C6BBD" }} />
            Livros em Leitura
          </h2>
          <Link href="/livros" className="text-xs flex items-center gap-1 transition-colors" style={{ color: "#D4AF37" }}>
            Ver todos <ChevronRight size={12} />
          </Link>
        </div>
        {books.length === 0 ? (
          <div className="card text-center py-8">
            <BookOpen size={32} className="mx-auto mb-3" style={{ color: "#555E6E" }} />
            <p className="text-sm" style={{ color: "#8B95A5" }}>Nenhum livro cadastrado</p>
            <Link href="/livros" className="btn-primary mt-3 inline-flex text-sm">
              Adicionar Livro
            </Link>
          </div>
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
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "#D4AF37" }} />
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
                  <span className={clsx("text-xs font-medium w-8 text-right", d.isToday && "font-bold")} style={{ color: d.isToday ? "#D4AF37" : "#8B95A5" }}>{d.day}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-10 text-right" style={{ color: "#7C6BBD" }}>Pág</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(124,107,189,0.08)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((d.pages || 0) / maxPages) * 100}%`, background: "linear-gradient(90deg, #7C6BBD, #9B8FD4)" }} />
                      </div>
                      <span className="text-[10px] w-6 text-right" style={{ color: "#8B95A5" }}>{d.pages || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-10 text-right" style={{ color: "#D4AF37" }}>Cap</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(212,175,55,0.08)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((d.chapters || 0) / maxChapters) * 100}%`, background: "linear-gradient(90deg, #A8892B, #D4AF37)" }} />
                      </div>
                      <span className="text-[10px] w-6 text-right" style={{ color: "#8B95A5" }}>{d.chapters || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-10 text-right" style={{ color: "#D94F4F" }}>🍅</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(217,79,79,0.08)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((d.pomodoros || 0) / maxPomodoros) * 100}%`, background: "linear-gradient(90deg, #B83E3E, #D94F4F)" }} />
                      </div>
                      <span className="text-[10px] w-6 text-right" style={{ color: "#8B95A5" }}>{d.pomodoros || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: "#7C6BBD" }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#7C6BBD" }} /> Páginas
            </span>
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: "#D4AF37" }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#D4AF37" }} /> Capítulos
            </span>
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: "#D94F4F" }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#D94F4F" }} /> Pomodoros
            </span>
          </div>
        </div>
      )}

      {/* Calendário de consistência */}
      <ConsistencyCalendar data={calendarData} />

      {/* Conquistas */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy size={16} style={{ color: "#D4AF37" }} />
          Conquistas
        </h2>
        <AchievementGrid unlocked={achievements.unlocked} compact />
      </div>

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
        <span className="text-[10px] font-bold" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <span className="text-[9px] uppercase tracking-wider" style={{ color: "#555E6E" }}>{label}</span>
    </div>
  );
}

function QuickAction({ href, icon, label, sub, color, done }: { href: string; icon: React.ReactNode; label: string; sub: string; color: string; done: boolean }) {
  return (
    <Link href={href} className="group relative rounded-2xl p-4 flex flex-col items-center gap-2 transition-all duration-300 hover:scale-[1.03] glow-border"
      style={{ background: `linear-gradient(145deg, ${color}08, rgba(20,24,32,0.8))`, border: `1px solid ${color}18` }}>
      {done && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "#3ABAB4" }}>
          <CheckCircle2 size={12} className="text-white" />
        </div>
      )}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[10px]" style={{ color: "#555E6E" }}>{sub}</p>
      </div>
    </Link>
  );
}

function StatCard({ icon, label, value, sub, cardClass, iconBg, progress, progressColor }: any) {
  return (
    <div className={clsx("stat-card", cardClass)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "#555E6E" }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-white count-up">{value}</p>
      <p className="text-[11px] mt-0.5" style={{ color: "#555E6E" }}>{sub}</p>
      {progress !== undefined && (
        <div className="progress-bar mt-3">
          <div className="progress-fill" style={{ width: `${Math.min(100, progress)}%`, background: progressColor }} />
        </div>
      )}
    </div>
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
          <p className="text-xs" style={{ color: "#555E6E" }}>{book.current_page}/{book.total_pages} pgs</p>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative"
          style={{ background: `${book.color}12` }}>
          <svg width="36" height="36" viewBox="0 0 36 36" className="absolute transform -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke={book.color} strokeWidth="3"
              strokeLinecap="round" strokeDasharray={`${14 * 2 * Math.PI}`}
              strokeDashoffset={`${14 * 2 * Math.PI * (1 - progress / 100)}`}
              className="transition-all duration-700" />
          </svg>
          <span className="text-[10px] font-bold" style={{ color: book.color }}>{progress}%</span>
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%`, background: done ? "#3ABAB4" : book.color }} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: "#555E6E" }}>
          Hoje: {book.pages_read_today}/{book.daily_goal} pgs
        </span>
        {done ? (
          <span className="badge" style={{ background: "rgba(58,186,180,0.12)", color: "#3ABAB4" }}>✓ Feito</span>
        ) : (
          <span className="badge" style={{ background: "rgba(232,132,74,0.12)", color: "#E8844A" }}>{pagesLeft} faltam</span>
        )}
      </div>
    </div>
  );
}

function ConsistencyCalendar({ data }: { data: CalendarDay[] }) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <div className="card">
      <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar size={16} style={{ color: "#D4AF37" }} />
        Calendário de Consistência
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="relative group">
            <div
              className="w-7 h-7 rounded-md transition-all duration-200 hover:scale-125 cursor-default"
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
              {format(new Date(d.date + "T12:00:00"), "dd/MM")}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: "rgba(212,175,55,0.5)" }} />
          <span className="text-xs" style={{ color: "#555E6E" }}>Meta cumprida</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: "rgba(212,175,55,0.12)" }} />
          <span className="text-xs" style={{ color: "#555E6E" }}>Parcial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: "rgba(255,255,255,0.02)" }} />
          <span className="text-xs" style={{ color: "#555E6E" }}>Sem registro</span>
        </div>
      </div>
    </div>
  );
}
