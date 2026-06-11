"use client";

import { useState, useEffect, useCallback } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { getBibleVerseOfDay } from "@/lib/ai";
import { BookMarked, Check, Plus, Calendar, TrendingUp, Star, ChevronDown, Sparkles, Target } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";
import { trackBibleChapter } from "@/lib/stats";
import { checkAndNotifyGoalCompletion } from "@/lib/notifications";
import { processGamification } from "@/lib/gamification";

import { HeroHeader } from "@/components/ui/HeroHeader";
import { GoalBadge } from "@/components/ui/GoalBadge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { GradientCard } from "@/components/ui/GradientCard";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { SkeletonPage } from "@/components/Skeleton";

const BIBLE_BOOKS = [
  "Gênesis","Êxodo","Levítico","Números","Deuteronômio","Josué","Juízes","Rute",
  "1 Samuel","2 Samuel","1 Reis","2 Reis","1 Crônicas","2 Crônicas","Esdras","Neemias","Ester",
  "Jó","Salmos","Provérbios","Eclesiastes","Cântico dos Cânticos","Isaías","Jeremias",
  "Lamentações","Ezequiel","Daniel","Oséias","Joel","Amós","Obadias","Jonas","Miquéias",
  "Naum","Habacuque","Sofonias","Ageu","Zacarias","Malaquias",
  "Mateus","Marcos","Lucas","João","Atos","Romanos","1 Coríntios","2 Coríntios",
  "Gálatas","Efésios","Filipenses","Colossenses","1 Tessalonicenses","2 Tessalonicenses",
  "1 Timóteo","2 Timóteo","Tito","Filemom","Hebreus","Tiago",
  "1 Pedro","2 Pedro","1 João","2 João","3 João","Judas","Apocalipse"
];

const READING_PLANS = [
  { id: "chronological", name: "Cronológico", chapters: 3, duration: "1 ano" },
  { id: "canonical", name: "Canônico", chapters: 3, duration: "1 ano" },
  { id: "nt-90", name: "NT em 90 dias", chapters: 3, duration: "3 meses" },
  { id: "psalms-proverbs", name: "Salmos & Provérbios", chapters: 2, duration: "Mensal" },
  { id: "custom", name: "Personalizado", chapters: 0, duration: "" },
];

export default function BibliaPage() {
  const { bibleGoal, setBibleGoal, todayBibleChapters, setTodayBibleChapters, streak } = useStore();
  const { user } = useAuth();
  const [verse, setVerse] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [logForm, setLogForm] = useState({ book: "Gênesis", chapter: 1, notes: "" });
  const [goalForm, setGoalForm] = useState({ daily_chapters: 3, plan_name: "custom" });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [weeklyError, setWeeklyError] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadGoal = useCallback(async () => {
    if (!user) return;
    try {
      setGoalError(false);
      const { data } = await dataFetch({ action: "select", table: "bible_goals", filters: { eq: { user_id: user.id }, maybeSingle: true } });
      if (data) { setBibleGoal(data as any); setGoalForm((prev) => ({ ...prev, ...(data as any) })); }
    } catch {
      toast.error("Erro ao carregar meta bíblica");
      setGoalError(true);
    }
  }, [user, setBibleGoal]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      setHistoryError(false);
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await dataFetch({ action: "select", table: "bible_readings", filters: { eq: { user_id: user.id }, order: { column: "read_at", ascending: false }, limit: 20 } });
      if (data) {
        setHistory(data as any[]);
        setTodayBibleChapters((data as any[]).filter((r: any) => r.read_at?.startsWith(today)).length);
      }
    } catch {
      toast.error("Erro ao carregar histórico");
      setHistoryError(true);
    }
  }, [user, setTodayBibleChapters]);

  const loadWeekly = useCallback(async () => {
    if (!user) return;
    try {
      setWeeklyError(false);
      const { data } = await dataFetch({ action: "select", table: "daily_stats", filters: { eq: { user_id: user.id }, order: { column: "date", ascending: false }, limit: 7, select: "date, bible_chapters_read" } });
      if (data) setWeeklyStats((data as any[]).reverse());
    } catch {
      toast.error("Erro ao carregar estatísticas semanais");
      setWeeklyError(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getBibleVerseOfDay().then(setVerse);
    loadHistory(); loadGoal(); loadWeekly();
  }, [user, loadHistory, loadGoal, loadWeekly]);

  async function logReading() {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await dataFetch({ action: "insert", table: "bible_readings", payload: {
        user_id: user.id, book_name: logForm.book, chapter: logForm.chapter, notes: logForm.notes,
        read_at: new Date().toISOString(),
      }});
      if (!error) {
        toast.success(`${logForm.book} ${logForm.chapter} registrado! ✝️`);
        await loadHistory();
        const { todayBibleChapters: freshCount, bibleGoal: freshGoal, books } = useStore.getState();
        const totalPagesRead = books.reduce((s: number, b: any) => s + b.pages_read_today, 0);
        const totalPagesGoal = books.reduce((s: number, b: any) => s + b.daily_goal, 0);
        trackBibleChapter(user.id, freshCount + 1, freshGoal?.daily_chapters || 0, totalPagesRead, totalPagesGoal).catch(() => {});
        processGamification("bible_chapter").catch(() => {});
        checkAndNotifyGoalCompletion({ pagesReadToday: totalPagesRead, pagesGoal: totalPagesGoal, bibleChaptersToday: freshCount + 1, bibleChaptersGoal: freshGoal?.daily_chapters || 0 });
        setLogForm((p) => ({ ...p, chapter: p.chapter + 1, notes: "" }));
      } else toast.error("Erro: " + error);
    } finally { setLoading(false); }
  }

  async function saveGoal() {
    if (!user) return;
    try {
      const { error } = await dataFetch({ action: "upsert", table: "bible_goals", payload: {
        user_id: user.id, daily_chapters: goalForm.daily_chapters, plan_name: goalForm.plan_name,
        start_date: format(new Date(), "yyyy-MM-dd"), updated_at: new Date().toISOString(),
      }});
      if (error) { toast.error("Erro ao salvar meta"); return; }
      toast.success("Meta bíblica atualizada!"); loadGoal(); setShowGoalForm(false);
    } catch { toast.error("Erro ao salvar meta"); }
  }

  const goalMet = bibleGoal ? todayBibleChapters >= bibleGoal.daily_chapters : false;
  const chaptersLeft = bibleGoal ? Math.max(0, bibleGoal.daily_chapters - todayBibleChapters) : 0;
  const pct = Math.round((todayBibleChapters / (bibleGoal?.daily_chapters || 1)) * 100);

  // ─── Loading Skeleton ──────────────────────────────────────────
  if (!mounted) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-8 page-enter">
      {/* Hero Header */}
      <div className="flex items-start justify-between">
        <HeroHeader
          title="Leitura Bíblica"
          icon={BookMarked}
          iconColor="var(--gold)"
        />
        <div className="flex items-center gap-2">
          {goalMet ? (
            <GoalBadge met={true} metLabel="Meta cumprida!" />
          ) : (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{
                background: "rgba(212,175,55,0.06)",
                border: "1px solid rgba(212,175,55,0.12)",
              }}
            >
              <Target size={16} style={{ color: "var(--gold)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--gold)" }}>{pct}%</span>
            </div>
          )}
          <button onClick={() => setShowGoalForm(!showGoalForm)} className="btn-ghost text-sm flex items-center gap-2">
            <Sparkles size={14} /> <ChevronDown size={14} className={clsx("transition-transform duration-300", showGoalForm && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Error: goal loading */}
      {goalError && (
        <ErrorCard
          title="Erro ao carregar meta"
          message="Não foi possível carregar sua meta de leitura bíblica."
          onRetry={loadGoal}
        />
      )}

      {/* Progress Overview: Ring + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
        {/* Central Progress Ring */}
        <GradientCard variant="gold" className="flex flex-col items-center justify-center py-6 shimmer">
          <ProgressRing
            value={todayBibleChapters}
            max={bibleGoal?.daily_chapters ?? 1}
            size={130}
            strokeWidth={7}
            color="var(--gold)"
            trackColor="rgba(255,255,255,0.03)"
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tracking-tight text-white">{todayBibleChapters}</span>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                de {bibleGoal?.daily_chapters ?? 0}
              </span>
            </div>
          </ProgressRing>
          <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>Capítulos hoje</p>
        </GradientCard>

        {/* Right column */}
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          {/* Status Card */}
          <GradientCard
            variant={goalMet ? "teal" : "gold"}
            className="col-span-2 flex items-center gap-4 glow-border"
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: goalMet
                  ? "rgba(58,186,180,0.12)"
                  : "rgba(212,175,55,0.08)",
              }}
            >
              {goalMet ? (
                <Check size={28} style={{ color: "var(--accent-teal)" }} />
              ) : (
                <BookMarked size={28} style={{ color: "var(--gold)" }} />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">
                {goalMet ? "Meta bíblica cumprida! 🙌" : `${todayBibleChapters} de ${bibleGoal?.daily_chapters ?? 0} capítulos`}
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {goalMet ? "A Palavra habita em você abundantemente." : `Faltam ${chaptersLeft} capítulo(s)`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tracking-tight gradient-text-gold">{pct}%</p>
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>do dia</p>
            </div>
          </GradientCard>

          {/* Mini stats */}
          <GradientCard variant="gold" className="p-4 text-center">
            <p className="text-2xl font-semibold tracking-tight count-up" style={{ color: "var(--gold)" }}>{history.length}</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>Total registradas</p>
          </GradientCard>
          <GradientCard variant="orange" className="p-4 text-center">
            <p className="text-2xl font-semibold tracking-tight count-up" style={{ color: "var(--accent-orange, #E8844A)" }}>{streak}</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>Streak</p>
          </GradientCard>
        </div>
      </div>

      {/* Versículo do Dia */}
      {verse && (
        <GradientCard variant="gold" className="relative overflow-hidden shimmer">
          <div
            className="absolute -top-16 -right-16 w-40 h-40 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5" style={{ color: "var(--gold)" }}>
              <Star size={11} /> Versículo do Dia
            </p>
            <p className="text-white font-serif italic text-lg leading-relaxed">&ldquo;{verse.verse}&rdquo;</p>
            <p className="mt-2 text-sm font-medium" style={{ color: "rgba(212,175,55,0.6)" }}>— {verse.reference}</p>
          </div>
        </GradientCard>
      )}

      {/* Error: history loading */}
      {historyError && (
        <ErrorCard
          title="Erro ao carregar histórico"
          message="Não foi possível carregar o histórico de leituras."
          onRetry={loadHistory}
        />
      )}

      {/* Config meta */}
      {showGoalForm && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold tracking-tight text-white mb-4">Plano de Leitura</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Plano</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {READING_PLANS.map((plan) => (
                  <button key={plan.id} onClick={() => setGoalForm((p) => ({ ...p, plan_name: plan.id, daily_chapters: plan.chapters || p.daily_chapters }))}
                    className={clsx("p-3 rounded-xl border text-left transition-all duration-200")}
                    style={{
                      borderColor: goalForm.plan_name === plan.id ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.05)",
                      background: goalForm.plan_name === plan.id ? "rgba(212,175,55,0.05)" : "transparent",
                      color: goalForm.plan_name === plan.id ? "var(--gold)" : "var(--text-muted)",
                    }}>
                    <p className="text-sm font-medium">{plan.name}</p>
                    {plan.duration && <p className="text-[10px] opacity-50">{plan.chapters} cap/dia · {plan.duration}</p>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Capítulos por dia</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setGoalForm((p) => ({ ...p, daily_chapters: Math.max(1, p.daily_chapters - 1) }))}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-lg font-semibold hover:bg-white/5 transition-colors" style={{ color: "var(--text-muted)" }}>−</button>
                <span className="text-2xl font-semibold tracking-tight text-white w-12 text-center">{goalForm.daily_chapters}</span>
                <button onClick={() => setGoalForm((p) => ({ ...p, daily_chapters: p.daily_chapters + 1 }))}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-lg font-semibold hover:bg-white/5 transition-colors" style={{ color: "var(--text-muted)" }}>+</button>
              </div>
            </div>
            <button onClick={saveGoal} className="btn-primary">Salvar Plano</button>
          </div>
        </div>
      )}

      {/* Registrar Leitura */}
      <div className="card shimmer">
        <h3 className="font-semibold tracking-tight text-white mb-4 flex items-center gap-2">
          <Plus size={16} style={{ color: "var(--gold)" }} /> Registrar Leitura
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Livro</label>
            <select className="input" aria-label="Livro bíblico" value={logForm.book} onChange={(e) => setLogForm((p) => ({ ...p, book: e.target.value }))}>
              {BIBLE_BOOKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Capítulo</label>
            <input type="number" min={1} className="input" aria-label="Capítulo" value={logForm.chapter}
              onChange={(e) => setLogForm((p) => ({ ...p, chapter: +e.target.value }))} />
          </div>
          <div>
            <label className="label">Anotações</label>
            <input className="input" aria-label="Anotações" placeholder="O que aprendeu?" value={logForm.notes}
              onChange={(e) => setLogForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <button onClick={logReading} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">
          <Check size={16} /> {loading ? "Salvando..." : "Marcar como Lido"}
        </button>
      </div>

      {/* Histórico */}
      <div>
        <h3 className="font-semibold tracking-tight text-white mb-3 flex items-center gap-2">
          <Calendar size={16} style={{ color: "var(--gold)" }} /> Leituras Recentes
        </h3>
        <div className="space-y-2 stagger-children">
          {history.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              iconColor="var(--gold)"
              title="Nenhuma leitura registrada"
              description="Registre seu primeiro capítulo acima"
            />
          ) : (
            history.map((r: any) => (
              <div key={r.id} className="glass-hover rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(212,175,55,0.08)" }}>
                    <BookMarked size={14} style={{ color: "var(--gold)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{r.book_name} {r.chapter}</p>
                    {r.notes && <p className="text-xs truncate max-w-xs" style={{ color: "var(--text-secondary)" }}>{r.notes}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{format(new Date(r.read_at), "dd/MM HH:mm")}</p>
                  <span className="badge text-[10px] mt-0.5" style={{ background: "rgba(58,186,180,0.1)", color: "var(--accent-teal)" }}>✓ Lido</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Error: weekly stats loading */}
      {weeklyError && (
        <ErrorCard
          title="Erro ao carregar estatísticas"
          message="Não foi possível carregar as estatísticas semanais."
          onRetry={loadWeekly}
        />
      )}

      {/* Stats semanais */}
      {weeklyStats.length > 0 && (
        <div className="card shimmer">
          <h3 className="font-semibold tracking-tight text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "var(--gold)" }} /> Capítulos por Dia
          </h3>
          <div className="flex items-end gap-2 h-28">
            {weeklyStats.map((s: any, i: number) => {
              const max = Math.max(...weeklyStats.map((x: any) => x.bible_chapters_read || 0), 1);
              const barPct = ((s.bible_chapters_read || 0) / max) * 100;
              const isToday = i === weeklyStats.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[11px] font-semibold" style={{ color: isToday ? "var(--gold)" : "var(--text-secondary)" }}>
                    {s.bible_chapters_read || 0}
                  </span>
                  <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                    <div className="w-full rounded-t-md transition-all duration-700"
                      style={{
                        height: `${barPct}%`,
                        minHeight: s.bible_chapters_read > 0 ? "4px" : "0",
                        background: isToday
                          ? "linear-gradient(to top, rgba(212,175,55,0.4), rgba(212,175,55,0.8))"
                          : "linear-gradient(to top, rgba(212,175,55,0.2), rgba(212,175,55,0.5))",
                        boxShadow: isToday ? "0 0 12px rgba(212,175,55,0.2)" : "none",
                      }} />
                  </div>
                  <p className={clsx("text-[11px]", isToday && "font-semibold")} style={{ color: isToday ? "var(--gold)" : "var(--text-secondary)" }}>
                    {format(new Date(s.date), "EEE", { locale: ptBR })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
