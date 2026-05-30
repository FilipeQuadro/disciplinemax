"use client";

import { useState, useEffect } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { getBibleVerseOfDay } from "@/lib/ai";
import { BookMarked, Check, Plus, Calendar, TrendingUp, Star, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { clsx } from "clsx";
import { trackBibleChapter } from "@/lib/stats";
import { checkAndNotifyGoalCompletion } from "@/lib/notifications";

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
  const { bibleGoal, setBibleGoal, todayBibleChapters, setTodayBibleChapters } = useStore();
  const { user } = useAuth();
  const [verse, setVerse] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [logForm, setLogForm] = useState({ book: "Gênesis", chapter: 1, notes: "" });
  const [goalForm, setGoalForm] = useState({ daily_chapters: 3, plan_name: "custom" });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getBibleVerseOfDay().then(setVerse);
    loadHistory(); loadGoal(); loadWeekly();
  }, [user]);

  async function loadGoal() {
    if (!user) return;
    try {
      const { data } = await dataFetch({ action: "select", table: "bible_goals", filters: { eq: { user_id: user.id }, maybeSingle: true } });
      if (data) { setBibleGoal(data as any); setGoalForm({ daily_chapters: (data as any).daily_chapters, plan_name: (data as any).plan_name || "custom" }); }
    } catch {
      toast.error("Erro ao carregar meta bíblica");
    }
  }

  async function loadHistory() {
    if (!user) return;
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await dataFetch({ action: "select", table: "bible_readings", filters: { eq: { user_id: user.id }, order: { column: "read_at", ascending: false }, limit: 20 } });
      if (data) {
        setHistory(data as any[]);
        setTodayBibleChapters((data as any[]).filter((r: any) => r.read_at?.startsWith(today)).length);
      }
    } catch {
      toast.error("Erro ao carregar histórico");
    }
  }

  async function loadWeekly() {
    if (!user) return;
    try {
      const { data } = await dataFetch({ action: "select", table: "daily_stats", filters: { eq: { user_id: user.id }, order: { column: "date", ascending: false }, limit: 7, select: "date, bible_chapters_read" } });
      if (data) setWeeklyStats((data as any[]).reverse());
    } catch {
      toast.error("Erro ao carregar estatísticas semanais");
    }
  }

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
        // Auto-update daily stats
        const newCount = (history.filter((r: any) => r.read_at?.startsWith(format(new Date(), "yyyy-MM-dd"))).length) + 1;
        const { books, bibleGoal } = useStore.getState();
        const totalPagesRead = books.reduce((s: number, b: any) => s + b.pages_read_today, 0);
        const totalPagesGoal = books.reduce((s: number, b: any) => s + b.daily_goal, 0);
        trackBibleChapter(user.id, newCount, bibleGoal?.daily_chapters || 0, totalPagesRead, totalPagesGoal).catch(() => {});
        checkAndNotifyGoalCompletion({ pagesReadToday: totalPagesRead, pagesGoal: totalPagesGoal, bibleChaptersToday: newCount, bibleChaptersGoal: bibleGoal?.daily_chapters || 0 });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <BookMarked size={24} style={{ color: "#D4AF37" }} /> Leitura Bíblica
          </h1>
          <p className="text-sm mt-1" style={{ color: "#555E6E" }}>Acompanhe sua jornada na Palavra</p>
        </div>
        <button onClick={() => setShowGoalForm(!showGoalForm)} className="btn-ghost text-sm flex items-center gap-2">
          <Sparkles size={14} /> Configurar <ChevronDown size={14} className={clsx("transition-transform duration-300", showGoalForm && "rotate-180")} />
        </button>
      </div>

      {/* Versículo */}
      {verse && (
        <div className="rounded-2xl p-5 relative overflow-hidden shimmer"
          style={{
            background: "linear-gradient(145deg, rgba(212,175,55,0.06) 0%, rgba(20,24,32,0.9) 60%, rgba(124,107,189,0.03) 100%)",
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

      {/* Status */}
      <div className={clsx(
        "rounded-2xl p-5 flex items-center justify-between glow-border transition-all duration-300",
      )}
        style={{
          background: goalMet
            ? "linear-gradient(145deg, rgba(58,186,180,0.06) 0%, rgba(20,24,32,0.9) 100%)"
            : "linear-gradient(145deg, rgba(212,175,55,0.04) 0%, rgba(20,24,32,0.9) 100%)",
          border: goalMet ? "1px solid rgba(58,186,180,0.15)" : "1px solid rgba(212,175,55,0.1)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className={clsx("w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all duration-500")}
            style={{
              background: goalMet ? "rgba(58,186,180,0.12)" : "rgba(212,175,55,0.08)",
              color: goalMet ? "#3ABAB4" : "#D4AF37",
            }}
          >
            {goalMet ? "✓" : todayBibleChapters}
          </div>
          <div>
            <p className="font-semibold text-white">
              {goalMet ? "Meta bíblica cumprida! 🙌" : `${todayBibleChapters} de ${bibleGoal?.daily_chapters ?? 0} capítulos`}
            </p>
            <p className="text-sm" style={{ color: "#8B95A5" }}>
              {goalMet ? "A Palavra habita em você abundantemente." : `Faltam ${chaptersLeft} capítulo(s)`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold gradient-text-gold">{pct}%</p>
          <p className="text-[10px]" style={{ color: "#555E6E" }}>do dia</p>
        </div>
      </div>

      {/* Config meta */}
      {showGoalForm && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold text-white mb-4">Plano de Leitura</h3>
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
                      color: goalForm.plan_name === plan.id ? "#D4AF37" : "#8B95A5",
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
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-lg font-bold hover:bg-white/5 transition-colors" style={{ color: "#8B95A5" }}>−</button>
                <span className="text-2xl font-bold text-white w-12 text-center">{goalForm.daily_chapters}</span>
                <button onClick={() => setGoalForm((p) => ({ ...p, daily_chapters: p.daily_chapters + 1 }))}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-lg font-bold hover:bg-white/5 transition-colors" style={{ color: "#8B95A5" }}>+</button>
              </div>
            </div>
            <button onClick={saveGoal} className="btn-primary">Salvar Plano</button>
          </div>
        </div>
      )}

      {/* Registrar */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Plus size={16} style={{ color: "#D4AF37" }} /> Registrar Leitura
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Livro</label>
            <select className="input" value={logForm.book} onChange={(e) => setLogForm((p) => ({ ...p, book: e.target.value }))}>
              {BIBLE_BOOKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Capítulo</label>
            <input type="number" min={1} className="input" value={logForm.chapter}
              onChange={(e) => setLogForm((p) => ({ ...p, chapter: +e.target.value }))} />
          </div>
          <div>
            <label className="label">Anotações</label>
            <input className="input" placeholder="O que aprendeu?" value={logForm.notes}
              onChange={(e) => setLogForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <button onClick={logReading} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">
          <Check size={16} /> {loading ? "Salvando..." : "Marcar como Lido"}
        </button>
      </div>

      {/* Histórico */}
      <div>
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Calendar size={16} style={{ color: "#D4AF37" }} /> Leituras Recentes
        </h3>
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="card text-center py-8" style={{ color: "#555E6E" }}>Nenhuma leitura registrada</div>
          ) : (
            history.map((r: any) => (
              <div key={r.id} className="glass-hover rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(212,175,55,0.08)" }}>
                    <BookMarked size={14} style={{ color: "#D4AF37" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{r.book_name} {r.chapter}</p>
                    {r.notes && <p className="text-xs truncate max-w-xs" style={{ color: "#555E6E" }}>{r.notes}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px]" style={{ color: "#555E6E" }}>{format(new Date(r.read_at), "dd/MM HH:mm")}</p>
                  <span className="badge text-[10px] mt-0.5" style={{ background: "rgba(58,186,180,0.1)", color: "#3ABAB4" }}>✓ Lido</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats semanais */}
      {weeklyStats.length > 0 && (
        <div className="card shimmer">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "#D4AF37" }} /> Capítulos por Dia
          </h3>
          <div className="flex items-end gap-2 h-24">
            {weeklyStats.map((s: any, i: number) => {
              const max = Math.max(...weeklyStats.map((x: any) => x.bible_chapters_read || 0), 1);
              const pct = ((s.bible_chapters_read || 0) / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                    <div className="w-full rounded-t-md transition-all duration-700"
                      style={{
                        height: `${pct}%`,
                        minHeight: s.bible_chapters_read > 0 ? "4px" : "0",
                        background: "linear-gradient(to top, rgba(212,175,55,0.3), rgba(212,175,55,0.6))",
                      }} />
                  </div>
                  <p className="text-[10px]" style={{ color: "#555E6E" }}>{format(new Date(s.date), "dd/MM")}</p>
                  <p className="text-[10px] font-semibold text-white">{s.bible_chapters_read || 0}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
