"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { getBibleVerseOfDay, getMotivationalMessage } from "@/lib/ai";
import {
  BookOpen, BookMarked, Timer, Flame, Target, CheckCircle2,
  TrendingUp, Calendar, Zap, ChevronRight, Star, Sparkles, FlameKindling
} from "lucide-react";
import Link from "next/link";
import { format, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { clsx } from "clsx";

export default function DashboardPage() {
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

  useEffect(() => {
    setMounted(true);
    async function load() {
      const todayStr = format(new Date(), "yyyy-MM-dd");

      const [booksRes, bibleGoalRes, settingsRes, statsRes, bibleReadingsRes] = await Promise.all([
        supabase.from("books").select("*").order("created_at"),
        supabase.from("bible_goals").select("*").maybeSingle(),
        supabase.from("user_settings").select("*").maybeSingle(),
        supabase.from("daily_stats").select("*").eq("date", todayStr).maybeSingle(),
        supabase.from("bible_readings").select("id").gte("read_at", todayStr),
      ]);

      if (booksRes.data) {
        const needsReset = !statsRes.data && booksRes.data.some((b: any) => b.pages_read_today > 0);
        if (needsReset) {
          const resetBooks = booksRes.data.map((b: any) => ({ ...b, pages_read_today: 0 }));
          setBooks(resetBooks as any[]);
          for (const b of booksRes.data as any[]) {
            if (b.pages_read_today > 0) {
              await (supabase.from("books") as any).update({ pages_read_today: 0 }).eq("id", b.id);
            }
          }
        } else {
          setBooks(booksRes.data as any[]);
        }
      }
      if (bibleGoalRes.data) setBibleGoal(bibleGoalRes.data as any);
      if (settingsRes.data) setSettings(settingsRes.data as any);
      if (statsRes.data) setTodayStats(statsRes.data as any);
      setTodayBibleChapters(bibleReadingsRes.data?.length ?? 0);

      const { data: recentStats } = await supabase
        .from("daily_stats")
        .select("date, goals_completed")
        .order("date", { ascending: false })
        .limit(30);
      if (recentStats) {
        let s = 0;
        for (const stat of recentStats as any[]) {
          if (stat.goals_completed) s++;
          else break;
        }
        setStreak(s);
      }

      const v = await getBibleVerseOfDay();
      setVerse(v);
      const m = await getMotivationalMessage({
        streak: streak,
        booksRead: booksRes.data?.length ?? books.length,
        bibleChapters: bibleReadingsRes.data?.length ?? todayBibleChapters,
        completedToday: (statsRes.data as any)?.goals_completed ?? false,
      });
      setMotivation(m);

      const start = startOfWeek(today, { weekStartsOn: 0 });
      const { data: weekData } = await supabase
        .from("daily_stats")
        .select("*")
        .gte("date", format(start, "yyyy-MM-dd"))
        .order("date") as { data: any[] | null };

      if (weekData) {
        const formatted = Array.from({ length: 7 }, (_, i) => {
          const d = addDays(start, i);
          const dateStr = format(d, "yyyy-MM-dd");
          const stat = weekData.find((s: any) => s.date === dateStr);
          return {
            day: format(d, "EEE", { locale: ptBR }),
            pages: stat?.books_pages_read || 0,
            chapters: stat?.bible_chapters_read || 0,
            pomodoros: stat?.pomodoros_completed || 0,
          };
        });
        setWeekStats(formatted);
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalPagesRead = books.reduce((sum, b) => sum + b.current_page, 0);
  const totalPagesGoal = books.reduce((sum, b) => sum + b.daily_goal, 0);
  const pagesReadToday = books.reduce((sum, b) => sum + b.pages_read_today, 0);
  const bibleGoalMet = bibleGoal ? todayBibleChapters >= bibleGoal.daily_chapters : false;
  const pomodoroGoal = settings?.pomodoros_until_long ?? 4;
  const allGoalsMet = pagesReadToday >= totalPagesGoal && bibleGoalMet;

  if (!mounted) return null;

  return (
    <div className="space-y-6 page-enter stagger-children">
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl shimmer"
            style={{ background: "rgba(58,186,180,0.08)", border: "1px solid rgba(58,186,180,0.15)" }}>
            <CheckCircle2 size={16} style={{ color: "#3ABAB4" }} />
            <span className="text-sm font-medium" style={{ color: "#3ABAB4" }}>Metas concluídas!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}>
            <Target size={16} style={{ color: "#D4AF37" }} />
            <span className="text-sm font-medium" style={{ color: "#D4AF37" }}>Em andamento</span>
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
            <p className="text-white font-serif italic text-lg leading-relaxed">"{verse.verse}"</p>
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

      {/* Gráfico da semana */}
      {weekStats.length > 0 && (
        <div className="card shimmer">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "#D4AF37" }} />
            Progresso da Semana
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weekStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C6BBD" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7C6BBD" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorChapters" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "#555E6E", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#555E6E", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#141820",
                  border: "1px solid rgba(212,175,55,0.12)",
                  borderRadius: "14px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  color: "#F0F0F0",
                }}
                labelStyle={{ color: "#8B95A5" }}
                itemStyle={{ color: "#F0F0F0" }}
              />
              <Area type="monotone" dataKey="pages" stroke="#7C6BBD" fill="url(#colorPages)" strokeWidth={2} name="Páginas" />
              <Area type="monotone" dataKey="chapters" stroke="#D4AF37" fill="url(#colorChapters)" strokeWidth={2} name="Capítulos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Calendário de consistência */}
      <ConsistencyCalendar />
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

function ConsistencyCalendar() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function loadCalendar() {
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
      const { data: stats } = await supabase
        .from("daily_stats")
        .select("date, goals_completed")
        .gte("date", startDate) as { data: { date: string; goals_completed: boolean }[] | null };

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
  }, []);

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
