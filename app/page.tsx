"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { getBibleVerseOfDay, getMotivationalMessage } from "@/lib/ai";
import {
  BookOpen, BookMarked, Timer, Flame, Target, CheckCircle2,
  TrendingUp, Calendar, Zap, ChevronRight, Star, Sparkles
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
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()},{" "}
            <span className="gradient-text">Discípulo!</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        {allGoalsMet ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shimmer">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Metas concluídas!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/15">
            <Target size={16} className="text-orange-400" />
            <span className="text-sm font-medium text-orange-400">Em andamento</span>
          </div>
        )}
      </div>

      {/* Versículo do dia */}
      {verse && (
        <div className="glass rounded-2xl p-5 border-l-4 border-amber-500/50 relative overflow-hidden shimmer">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-violet-500/5" />
          <div className="relative">
            <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Star size={12} />
              Versículo do Dia
            </p>
            <p className="text-white font-medium italic text-lg leading-relaxed">"{verse.verse}"</p>
            <p className="text-amber-400/60 text-sm mt-2">— {verse.reference}</p>
          </div>
        </div>
      )}

      {/* Stats principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Flame size={20} className="text-orange-400" />}
          label="Streak"
          value={`${streak}`}
          sub="dias consecutivos"
          color="from-orange-500/15 to-red-500/10"
          border="border-orange-500/15"
          glowColor="rgba(249,115,22,0.1)"
        />
        <StatCard
          icon={<BookOpen size={20} className="text-violet-400" />}
          label="Páginas Hoje"
          value={`${pagesReadToday}/${totalPagesGoal}`}
          sub={`de ${books.length} livros`}
          color="from-violet-500/15 to-purple-500/10"
          border="border-violet-500/15"
          progress={totalPagesGoal > 0 ? (pagesReadToday / totalPagesGoal) * 100 : 0}
          progressColor="bg-violet-500"
          glowColor="rgba(139,92,246,0.1)"
        />
        <StatCard
          icon={<BookMarked size={20} className="text-amber-400" />}
          label="Bíblia Hoje"
          value={`${todayBibleChapters}/${bibleGoal?.daily_chapters ?? 0}`}
          sub="capítulos"
          color="from-amber-500/15 to-yellow-500/10"
          border="border-amber-500/15"
          progress={bibleGoal ? (todayBibleChapters / bibleGoal.daily_chapters) * 100 : 0}
          progressColor="bg-amber-500"
          glowColor="rgba(245,158,11,0.1)"
        />
        <StatCard
          icon={<Timer size={20} className="text-red-400" />}
          label="Pomodoros"
          value={`${pomodoroCount}/${pomodoroGoal}`}
          sub="sessões de foco"
          color="from-red-500/15 to-rose-500/10"
          border="border-red-500/15"
          progress={(pomodoroCount / pomodoroGoal) * 100}
          progressColor="bg-red-500"
          glowColor="rgba(239,68,68,0.1)"
        />
      </div>

      {/* Motivação da IA */}
      {motivation && (
        <div className="glass rounded-2xl p-4 flex items-start gap-3 glow-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-sky-400 font-semibold mb-1 flex items-center gap-1.5">
              <Zap size={10} /> IA Motivacional
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">{motivation}</p>
          </div>
        </div>
      )}

      {/* Livros em andamento */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <BookOpen size={16} className="text-violet-400" />
            Livros em Leitura
          </h2>
          <Link href="/livros" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors">
            Ver todos <ChevronRight size={12} />
          </Link>
        </div>
        {books.length === 0 ? (
          <div className="card text-center py-8">
            <BookOpen size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum livro cadastrado</p>
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
            <TrendingUp size={16} className="text-sky-400" />
            Progresso da Semana
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weekStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorChapters" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#12121c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#f1f5f9" }}
              />
              <Area type="monotone" dataKey="pages" stroke="#8b5cf6" fill="url(#colorPages)" strokeWidth={2} name="Páginas" />
              <Area type="monotone" dataKey="chapters" stroke="#f59e0b" fill="url(#colorChapters)" strokeWidth={2} name="Capítulos" />
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

function StatCard({ icon, label, value, sub, color, border, progress, progressColor, glowColor }: any) {
  return (
    <div className={clsx(
      "rounded-2xl p-4 bg-gradient-to-br border transition-all duration-300 hover:scale-[1.02] cursor-default",
      color, border
    )}
    style={{ ["--tw-shadow-color" as string]: glowColor }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold text-white count-up">{value}</p>
      <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
      {progress !== undefined && (
        <div className="progress-bar mt-3">
          <div
            className={clsx("progress-fill", progressColor)}
            style={{ width: `${Math.min(100, progress)}%` }}
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
      "glass rounded-xl p-4 transition-all duration-300 hover:scale-[1.01] glow-border",
      done && "border-emerald-500/20 bg-emerald-500/3"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{book.title}</p>
          <p className="text-xs text-slate-600">{book.current_page}/{book.total_pages} pgs</p>
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm"
          style={{ background: book.color + "22", color: book.color }}
        >
          {progress}%
        </div>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%`, background: done ? "#10b981" : book.color }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-600">
          Hoje: {book.pages_read_today}/{book.daily_goal} pgs
        </span>
        {done ? (
          <span className="badge bg-emerald-500/15 text-emerald-400">✓ Feito</span>
        ) : (
          <span className="badge bg-orange-500/15 text-orange-400">{pagesLeft} faltam</span>
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
        <Calendar size={16} className="text-sky-400" />
        Calendário de Consistência
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {data.map((d, i) => (
          <div
            key={i}
            title={d.date}
            className={clsx(
              "w-7 h-7 rounded-md transition-all duration-200 hover:scale-125 cursor-default",
              d.done ? "bg-emerald-500/70 shadow-sm shadow-emerald-500/20" : d.partial ? "bg-emerald-500/20" : "bg-white/3"
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/70" />
          <span className="text-xs text-slate-600">Meta cumprida</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/20" />
          <span className="text-xs text-slate-600">Parcial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-white/3" />
          <span className="text-xs text-slate-600">Sem registro</span>
        </div>
      </div>
    </div>
  );
}
