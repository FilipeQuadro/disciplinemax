"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { getBibleVerseOfDay } from "@/lib/ai";
import { BookMarked, Check, Plus, Calendar, TrendingUp, Star, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

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
  { id: "chronological", name: "Plano Cronológico", chapters: 3, duration: "1 ano" },
  { id: "canonical", name: "Plano Canônico", chapters: 3, duration: "1 ano" },
  { id: "nt-90", name: "Novo Testamento 90 dias", chapters: 3, duration: "3 meses" },
  { id: "psalms-proverbs", name: "Salmos & Provérbios", chapters: 2, duration: "Mensal" },
  { id: "custom", name: "Personalizado", chapters: 0, duration: "" },
];

export default function BibliaPage() {
  const { bibleGoal, setBibleGoal, todayBibleChapters, setTodayBibleChapters } = useStore();
  const [verse, setVerse] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [logForm, setLogForm] = useState({ book: "Gênesis", chapter: 1, notes: "" });
  const [goalForm, setGoalForm] = useState({ daily_chapters: 3, plan_name: "custom" });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBibleVerseOfDay().then(setVerse);
    loadHistory();
    loadGoal();
    loadWeekly();
  }, []);

  async function loadGoal() {
    const { data } = await supabase.from("bible_goals").select("*").maybeSingle() as { data: { daily_chapters: number; plan_name?: string } | null };
    if (data) { setBibleGoal(data as any); setGoalForm({ daily_chapters: data.daily_chapters, plan_name: data.plan_name || "custom" }); }
  }

  async function loadHistory() {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase.from("bible_readings")
      .select("*").order("read_at", { ascending: false }).limit(20);
    if (data) {
      setHistory(data);
      const todayCount = data.filter((r: any) => r.read_at?.startsWith(today)).length;
      setTodayBibleChapters(todayCount);
    }
  }

  async function loadWeekly() {
    const { data } = await supabase.from("daily_stats")
      .select("date, bible_chapters_read").order("date", { ascending: false }).limit(7);
    if (data) setWeeklyStats(data.reverse());
  }

  async function logReading() {
    setLoading(true);
    try {
      const { error } = await supabase.from("bible_readings").insert({
        book_name: logForm.book,
        chapter: logForm.chapter,
        notes: logForm.notes,
        read_at: new Date().toISOString(),
      } as any);
      if (!error) {
        toast.success(`${logForm.book} ${logForm.chapter} registrado! ✝️`);
        setTodayBibleChapters(todayBibleChapters + 1);
        await loadHistory();
        setLogForm((p) => ({ ...p, chapter: p.chapter + 1, notes: "" }));
      } else toast.error("Erro: " + error.message);
    } finally { setLoading(false); }
  }

  async function saveGoal() {
    const { error } = await supabase.from("bible_goals").upsert({
      daily_chapters: goalForm.daily_chapters,
      plan_name: goalForm.plan_name,
      start_date: format(new Date(), "yyyy-MM-dd"),
      updated_at: new Date().toISOString(),
    } as any);
    if (!error) { toast.success("Meta bíblica atualizada!"); loadGoal(); setShowGoalForm(false); }
  }

  const goalMet = bibleGoal ? todayBibleChapters >= bibleGoal.daily_chapters : false;
  const chaptersLeft = bibleGoal ? Math.max(0, bibleGoal.daily_chapters - todayBibleChapters) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookMarked size={24} className="text-amber-400" /> Leitura Bíblica
          </h1>
          <p className="text-slate-400 text-sm mt-1">Acompanhe sua jornada na Palavra</p>
        </div>
        <button onClick={() => setShowGoalForm(!showGoalForm)} className="btn-ghost text-sm flex items-center gap-2">
          Configurar Meta <ChevronDown size={14} className={clsx("transition-transform", showGoalForm && "rotate-180")} />
        </button>
      </div>

      {/* Versículo do dia */}
      {verse && (
        <div className="rounded-2xl p-5 relative overflow-hidden border border-amber-500/20"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(120,53,15,0.05) 100%)" }}>
          <div className="flex items-start gap-3">
            <Star size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-400/80 font-semibold uppercase tracking-wider mb-2">Versículo do Dia</p>
              <p className="text-white font-medium italic text-lg leading-relaxed">"{verse.verse}"</p>
              <p className="text-amber-400/70 text-sm mt-2">— {verse.reference}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status do dia */}
      <div className={clsx(
        "card flex items-center justify-between",
        goalMet ? "border border-emerald-500/30 bg-emerald-500/5" : "border border-amber-500/20"
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold",
            goalMet ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
            {goalMet ? "✓" : `${todayBibleChapters}`}
          </div>
          <div>
            <p className="font-semibold text-white">
              {goalMet ? "Meta bíblica cumprida hoje! 🙌" : `${todayBibleChapters} de ${bibleGoal?.daily_chapters ?? 0} capítulos`}
            </p>
            <p className="text-sm text-slate-400">
              {goalMet ? "Que a Palavra habite em você abundantemente." : `Faltam ${chaptersLeft} capítulos para hoje`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{Math.round((todayBibleChapters / (bibleGoal?.daily_chapters || 1)) * 100)}%</p>
          <p className="text-xs text-slate-500">do dia</p>
        </div>
      </div>

      {/* Configurar meta */}
      {showGoalForm && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold text-white mb-4">Configurar Plano de Leitura</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Plano de Leitura</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {READING_PLANS.map((plan) => (
                  <button key={plan.id} onClick={() => setGoalForm((p) => ({
                    ...p, plan_name: plan.id, daily_chapters: plan.chapters || p.daily_chapters
                  }))}
                    className={clsx("p-3 rounded-xl border text-left transition-all", goalForm.plan_name === plan.id
                      ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                      : "border-white/10 hover:border-white/20 text-slate-400")}>
                    <p className="text-sm font-medium">{plan.name}</p>
                    {plan.duration && <p className="text-xs opacity-70">{plan.chapters} cap/dia · {plan.duration}</p>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Capítulos por dia</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setGoalForm((p) => ({ ...p, daily_chapters: Math.max(1, p.daily_chapters - 1) }))}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-lg font-bold text-slate-300 hover:text-white">-</button>
                <span className="text-2xl font-bold text-white w-12 text-center">{goalForm.daily_chapters}</span>
                <button onClick={() => setGoalForm((p) => ({ ...p, daily_chapters: p.daily_chapters + 1 }))}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-lg font-bold text-slate-300 hover:text-white">+</button>
              </div>
            </div>
            <button onClick={saveGoal} className="btn-primary">Salvar Plano</button>
          </div>
        </div>
      )}

      {/* Registrar leitura */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Plus size={16} className="text-amber-400" /> Registrar Leitura
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Livro da Bíblia</label>
            <select className="input" value={logForm.book}
              onChange={(e) => setLogForm((p) => ({ ...p, book: e.target.value }))}>
              {BIBLE_BOOKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Capítulo</label>
            <input type="number" min={1} className="input" value={logForm.chapter}
              onChange={(e) => setLogForm((p) => ({ ...p, chapter: +e.target.value }))} />
          </div>
          <div>
            <label className="label">Anotações (opcional)</label>
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
          <Calendar size={16} className="text-amber-400" /> Leituras Recentes
        </h3>
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="card text-center py-8 text-slate-500">Nenhuma leitura registrada</div>
          ) : (
            history.map((r: any) => (
              <div key={r.id} className="glass-hover rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <BookMarked size={15} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{r.book_name} {r.chapter}</p>
                    {r.notes && <p className="text-xs text-slate-500 truncate max-w-xs">{r.notes}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {format(new Date(r.read_at), "dd/MM HH:mm")}
                  </p>
                  <span className="badge bg-emerald-500/20 text-emerald-400 text-xs mt-0.5">✓ Lido</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats semanais */}
      {weeklyStats.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-400" /> Capítulos por Dia (últimos 7 dias)
          </h3>
          <div className="flex items-end gap-2 h-24">
            {weeklyStats.map((s: any, i: number) => {
              const max = Math.max(...weeklyStats.map((x: any) => x.bible_chapters_read || 0), 1);
              const pct = ((s.bible_chapters_read || 0) / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                    <div className="w-full rounded-t-md bg-amber-500/70 transition-all duration-500"
                      style={{ height: `${pct}%`, minHeight: s.bible_chapters_read > 0 ? "4px" : "0" }} />
                  </div>
                  <p className="text-xs text-slate-500">{format(new Date(s.date), "dd/MM")}</p>
                  <p className="text-xs font-medium text-white">{s.bible_chapters_read || 0}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
