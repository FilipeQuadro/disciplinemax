"use client";

import { useEffect, useState } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { getBibleVerseOfDay, getMotivationalMessage } from "@/lib/ai";
import {
  BookOpen, BookMarked, Timer, Flame, Target, CheckCircle2,
  TrendingUp, Calendar, Zap, ChevronRight, Star, Sparkles, Trophy, Share2
} from "lucide-react";
import Link from "next/link";
import { format, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { useAchievements, AchievementGrid, AchievementNotification } from "@/components/Achievements";

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    books, setBooks, streak, setStreak, todayStats, setTodayStats,
    bibleGoal, setBibleGoal, todayBibleChapters, setTodayBibleChapters,
    pomodoroCount, settings, setSettings,
  } = useStore();
  const [verse, setVerse] = useState<{ verse: string; reference: string } | null>(null);
  const [motivation, setMotivation] = useState("");
  const [weekStats, setWeekStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const today = new Date();
  const achievements = useAchievements();

  useEffect(() => {
    setMounted(true);
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      const todayStr = format(new Date(), "yyyy-MM-dd");

      try {
        const [booksRes, bibleGoalRes, settingsRes, statsRes, bibleReadingsRes] = await Promise.all([
          dataFetch({ action: "select", table: "books", filters: { eq: { user_id: user.id }, order: { column: "created_at", ascending: true } } }),
          dataFetch({ action: "select", table: "bible_goals", filters: { eq: { user_id: user.id }, maybeSingle: true } }),
          dataFetch({ action: "select", table: "user_settings", filters: { eq: { user_id: user.id }, maybeSingle: true } }),
          dataFetch({ action: "select", table: "daily_stats", filters: { eq: { user_id: user.id, date: todayStr }, maybeSingle: true } }),
          dataFetch({ action: "select", table: "bible_readings", filters: { eq: { user_id: user.id }, gte: { read_at: todayStr }, select: "id" } }),
        ]);

        if (booksRes.data) {
          const needsReset = !statsRes.data && (booksRes.data as any[]).some((b: any) => b.pages_read_today > 0);
          if (needsReset) {
            const resetBooks = (booksRes.data as any[]).map((b: any) => ({ ...b, pages_read_today: 0 }));
            setBooks(resetBooks as any[]);
            for (const b of booksRes.data as any[]) {
              if (b.pages_read_today > 0) {
                await dataFetch({ action: "update", table: "books", id: b.id, payload: { pages_read_today: 0 } });
              }
            }
          } else {
            setBooks(booksRes.data as any[]);
          }
        }
        if (bibleGoalRes.data) {
          setBibleGoal(bibleGoalRes.data as any);
        } else {
          // Auto-heal: bible_goals missing
          const { data: newGoal } = await dataFetch({ action: "upsert", table: "bible_goals", payload: { user_id: user.id, daily_chapters: 3, plan_name: "custom" } });
          if (newGoal) setBibleGoal(newGoal as any);
        }
        if (settingsRes.data) {
          setSettings(settingsRes.data as any);
        } else {
          // Auto-heal: user_settings missing (trigger didn't fire or user pre-dates trigger)
          const defaultSettings = {
            user_id: user.id,
            notification_times: ["07:00", "12:00", "19:00"],
            pomodoro_duration: 25, short_break: 5, long_break: 15, pomodoros_until_long: 4,
            daily_books_goal: 20, daily_bible_chapters: 3, timezone: "America/Sao_Paulo",
          };
          const { data: newSettings } = await dataFetch({ action: "upsert", table: "user_settings", payload: defaultSettings });
          if (newSettings) setSettings(newSettings as any);
        }
        if (statsRes.data) setTodayStats(statsRes.data as any);
        setTodayBibleChapters((bibleReadingsRes.data as any[])?.length ?? 0);

        const recentStatsRes = await dataFetch<any[]>({ action: "select", table: "daily_stats", filters: { eq: { user_id: user.id }, order: { column: "date", ascending: false }, limit: 30, select: "date, goals_completed" } });
        let newStreak = 0;
        if (recentStatsRes.data) {
          for (const stat of recentStatsRes.data as any[]) {
            if (stat.goals_completed) newStreak++;
            else break;
          }
        }
        setStreak(newStreak);

        const v = await getBibleVerseOfDay();
        setVerse(v);
        const m = await getMotivationalMessage({
          streak: newStreak,
          booksRead: booksRes.data?.length ?? books.length,
          bibleChapters: bibleReadingsRes.data?.length ?? todayBibleChapters,
          completedToday: (statsRes.data as any)?.goals_completed ?? false,
        });
        setMotivation(m);

        const start = startOfWeek(today, { weekStartsOn: 0 });
        const weekDataRes = await dataFetch<any[]>({ action: "select", table: "daily_stats", filters: { eq: { user_id: user.id }, gte: { date: format(start, "yyyy-MM-dd") }, order: { column: "date", ascending: true } } });

        if (weekDataRes.data) {
          const formatted = Array.from({ length: 7 }, (_, i) => {
            const d = addDays(start, i);
            const dateStr = format(d, "yyyy-MM-dd");
            const stat = weekDataRes.data!.find((s: any) => s.date === dateStr);
            return {
              day: format(d, "EEE", { locale: ptBR }),
              pages: stat?.books_pages_read || 0,
              chapters: stat?.bible_chapters_read || 0,
              pomodoros: stat?.pomodoros_completed || 0,
            };
          });
          setWeekStats(formatted);
        }
      } catch (e) {
        console.error("Dashboard load error:", e);
        toast.error("Erro ao carregar dados. Verifique sua conexão.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

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

  const totalPagesRead = books.reduce((sum, b) => sum + b.current_page, 0);
  const totalPagesGoal = books.reduce((sum, b) => sum + b.daily_goal, 0);
  const pagesReadToday = books.reduce((sum, b) => sum + b.pages_read_today, 0);
  const bibleGoalMet = bibleGoal ? todayBibleChapters >= bibleGoal.daily_chapters : false;
  const pomodoroGoal = settings?.pomodoros_until_long ?? 4;
  const allGoalsMet = pagesReadToday >= totalPagesGoal && bibleGoalMet;

  function shareProgress() {
    const bibleStatus = bibleGoal ? `${todayBibleChapters}/${bibleGoal.daily_chapters} cap.` : "✓";
    const text = `🔥 DisciplinaMax — Meu progresso hoje!\n\n📚 ${pagesReadToday}/${totalPagesGoal} páginas\n✝️ Bíblia: ${bibleStatus}\n🍅 ${pomodoroCount} pomodoros\n🔥 ${streak} dias de streak\n\n👉 disciplinemax.onrender.com`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "DisciplinaMax — Progresso", text }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast.success("Copiado para a área de transferência! 📋")).catch(() => {});
    }
  }

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
        <div className="h-32 rounded-2xl bg-white/[0.02]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0,1,2,3].map((i) => <div key={i} className="h-28 rounded-xl bg-white/[0.02]" />)}
        </div>
        <div className="h-20 rounded-xl bg-white/[0.02]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0,1].map((i) => <div key={i} className="h-36 rounded-xl bg-white/[0.02]" />)}
        </div>
        <div className="h-48 rounded-xl bg-white/[0.02]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs mb-1" style={{ color: "#555E6E" }}>
            {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <h1 className="text-2xl font-serif font-bold text-white">
            {getGreeting()}, <span className="gradient-text-gold">Leitor!</span> 👋
          </h1>
        </div>
        {allGoalsMet ? (
          <div className="flex items-center gap-2">
            <button onClick={shareProgress} className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105"
              style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}>
              <Share2 size={14} style={{ color: "#D4AF37" }} />
              <span className="text-sm font-medium" style={{ color: "#D4AF37" }}>Compartilhar</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl shimmer"
              style={{ background: "rgba(58,186,180,0.08)", border: "1px solid rgba(58,186,180,0.15)" }}>
              <CheckCircle2 size={16} style={{ color: "#3ABAB4" }} />
              <span className="text-sm font-medium" style={{ color: "#3ABAB4" }}>Metas concluídas!</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={shareProgress} className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Share2 size={14} style={{ color: "#555E6E" }} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}>
              <Target size={16} style={{ color: "#D4AF37" }} />
              <span className="text-sm font-medium" style={{ color: "#D4AF37" }}>Em andamento</span>
            </div>
          </div>
        )}
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

      {/* Stats principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {books.slice(0, 4).map((book) => (
              <BookMiniCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>

      {/* Gráfico da semana — CSS bars (zero JS bundle) */}
      {weekStats.length > 0 && (
        <div className="card shimmer">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "#D4AF37" }} />
            Progresso da Semana
          </h2>
          <div className="space-y-2">
            {weekStats.map((d: any, i: number) => {
              const maxPages = Math.max(...weekStats.map((w: any) => w.pages || 0), 1);
              const maxChapters = Math.max(...weekStats.map((w: any) => w.chapters || 0), 1);
              return (
                <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-xl" style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <span className="text-xs font-medium w-8 text-right" style={{ color: "#8B95A5" }}>{d.day}</span>
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
          </div>
        </div>
      )}

      {/* Calendário de consistência */}
      <ConsistencyCalendar userId={user?.id ?? ""} />

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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
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
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, progress)}%`, background: progressColor }}
          />
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
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ background: book.color + "18", color: book.color }}
        >
          {progress}%
        </div>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%`, background: done ? "#3ABAB4" : book.color }}
        />
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

function ConsistencyCalendar({ userId }: { userId: string }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function loadCalendar() {
      if (!userId) return;
      const days = 35;
      const arr = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        arr.push({
          date: format(d, "yyyy-MM-dd"),
          done: false,
          partial: false,
        });
      }

      const startDate = arr[0].date;
      const { data: stats } = await dataFetch<{ date: string; goals_completed: boolean }[]>({
        action: "select", table: "daily_stats",
        filters: { eq: { user_id: userId }, gte: { date: startDate }, select: "date, goals_completed" }
      });

      if (stats) {
        for (const entry of arr) {
          const stat = stats.find((s: any) => s.date === entry.date);
          if (stat) {
            entry.done = stat.goals_completed || false;
            entry.partial = !stat.goals_completed;
          }
        }
      }
      setData(arr);
    }
    loadCalendar();
  }, [userId]);

  return (
    <div className="card">
      <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar size={16} style={{ color: "#D4AF37" }} />
        Calendário de Consistência
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {data.map((d, i) => (
          <div
            key={i}
            title={d.date}
            className={clsx(
              "w-7 h-7 rounded-md transition-all duration-200 hover:scale-125 cursor-default",
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
