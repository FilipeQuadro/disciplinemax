"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { OnboardingService } from "@/lib/services/onboarding-service";
import {
  BookOpen, BookMarked, Timer, Target, Sparkles, ChevronRight,
  ChevronLeft, CheckCircle2, Sun, Moon, Zap, ArrowRight
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "react-hot-toast";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────
interface OnboardingData {
  studyArea: string;
  objective: string;
  preferredTimes: string[];
  frequency: string;
  firstAction: string;
}

const STUDY_AREAS = [
  { id: "theology", label: "Teologia", icon: BookMarked, color: "var(--gold)" },
  { id: "devotional", label: "Devocional", icon: Sparkles, color: "var(--accent-purple)" },
  { id: "academic", label: "Acadêmico", icon: BookOpen, color: "var(--accent-teal)" },
  { id: "personal", label: "Pessoal", icon: Target, color: "var(--accent-orange)" },
];

const OBJECTIVES = [
  { id: "discipline", label: "Disciplina diária", desc: "Criar hábito de leitura consistente" },
  { id: "study", label: "Estudo profundo", desc: "Aprofundar conhecimento em uma área" },
  { id: "balance", label: "Equilíbrio", desc: "Conciliar leitura, bíblia e foco" },
  { id: "productivity", label: "Produtividade", desc: "Maximizar o tempo de estudo" },
];

const TIME_OPTIONS = [
  { id: "morning", label: "Manhã", time: "07:00", icon: Sun, color: "var(--gold)" },
  { id: "afternoon", label: "Tarde", time: "12:00", icon: Zap, color: "var(--accent-orange)" },
  { id: "evening", label: "Noite", time: "19:00", icon: Moon, color: "var(--accent-purple)" },
];

const FREQUENCIES = [
  { id: "daily", label: "Todo dia", desc: "Máxima consistência", recommended: true },
  { id: "weekdays", label: "Dias úteis", desc: "Segunda a sexta" },
  { id: "3x", label: "3x por semana", desc: "Flexibilidade" },
];

const FIRST_ACTIONS = [
  { id: "book", label: "Adicionar meu primeiro livro", desc: "Comece a acompanhar sua leitura", href: "/livros", icon: BookOpen, color: "var(--accent-purple)" },
  { id: "pomodoro", label: "Iniciar primeiro foco", desc: "25 minutos de concentração", href: "/pomodoro", icon: Timer, color: "var(--accent-red)" },
  { id: "bible", label: "Ler primeiro capítulo", desc: "Comece seu hábito bíblico", href: "/biblia", icon: BookMarked, color: "var(--gold)" },
];

// ── Main Component ─────────────────────────────────────────────
export default function OnboardingPage() {
  const { user } = useAuth();
  const setSettings = useStore((s) => s.setSettings);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [data, setData] = useState<OnboardingData>({
    studyArea: "",
    objective: "",
    preferredTimes: [],
    frequency: "daily",
    firstAction: "",
  });

  const steps = [
    { title: "Área de Estudo", desc: "Qual é o seu foco principal?" },
    { title: "Objetivo", desc: "O que você quer alcançar?" },
    { title: "Horários", desc: "Quando prefere estudar?" },
    { title: "Frequência", desc: "Com que frequência?" },
    { title: "Primeira Ação", desc: "Vamos começar! Escolha por onde entrar" },
  ];

  // ── Restore progress on mount ──────────────────────────────
  useEffect(() => {
    async function restore() {
      if (!user) { setRestoring(false); return; }
      try {
        const onboardingService = new OnboardingService();
        const progress = await onboardingService.getProgress(user.id);
        if (progress && !progress.completed) {
          setStep(progress.step);
          if (progress.step_data && Object.keys(progress.step_data).length > 0) {
            setData((prev) => ({ ...prev, ...(progress.step_data as Partial<OnboardingData>) }));
          }
        } else if (progress?.completed) {
          // Already completed onboarding — redirect to dashboard
          window.location.href = "/";
          return;
        }
      } catch { /* best effort */ }
      setRestoring(false);
    }
    restore();
  }, [user]);

  // ── Persist step on navigation ────────────────────────────
  async function goToStep(newStep: number) {
    if (!user) { setStep(newStep); return; }
    setStep(newStep);
    try {
      const onboardingService = new OnboardingService();
      await onboardingService.saveStep(user.id, newStep, data as unknown as Record<string, unknown>);
    } catch { /* best effort — don't block navigation */ }
  }

  async function handleComplete() {
    if (!user) return;
    setLoading(true);

    try {
      // Generate notification times based on preferred times
      const notificationTimes = data.preferredTimes.length > 0
        ? data.preferredTimes.map((t) => TIME_OPTIONS.find((o) => o.id === t)?.time ?? "07:00")
        : ["07:00", "12:00", "19:00"];

      // Generate daily goals based on objective and frequency
      const isIntensive = data.objective === "study" || data.objective === "productivity";
      const dailyBooksGoal = isIntensive ? 30 : 20;
      const dailyBibleChapters = data.studyArea === "theology" || data.studyArea === "devotional" ? 5 : 3;
      const pomodoroDuration = isIntensive ? 30 : 25;

      // Upsert user_settings with onboarding config
      const { data: settings } = await dataFetch({
        action: "upsert",
        table: "user_settings",
        payload: {
          user_id: user.id,
          notification_times: notificationTimes,
          pomodoro_duration: pomodoroDuration,
          short_break: 5,
          long_break: 15,
          pomodoros_until_long: 4,
          daily_books_goal: dailyBooksGoal,
          daily_bible_chapters: dailyBibleChapters,
          timezone: "America/Sao_Paulo",
        },
      });

      if (settings) setSettings(settings as any);

      // Ensure user has a plan
      await dataFetch({
        action: "upsert",
        table: "user_plans",
        payload: { user_id: user.id, plan: "free" },
      });

      // Ensure user has bible goals
      await dataFetch({
        action: "upsert",
        table: "bible_goals",
        payload: {
          user_id: user.id,
          daily_chapters: dailyBibleChapters,
          plan_name: data.studyArea || "custom",
        },
      });

      // Mark onboarding complete via service (also fires ONBOARDING_COMPLETED event)
      const onboardingService = new OnboardingService();
      await onboardingService.completeOnboarding(user.id, {
        study_area: data.studyArea,
        objective: data.objective,
        preferred_times: data.preferredTimes,
        frequency: data.frequency,
        first_action: data.firstAction,
      });

      toast.success("Configuração concluída! Bem-vindo ao DisciplinaMax 🎉");

      // Redirect to chosen first action
      const chosenAction = FIRST_ACTIONS.find((a) => a.id === data.firstAction);
      window.location.href = chosenAction?.href ?? "/";
    } catch (e) {
      toast.error("Erro ao salvar configuração. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const canProceed = () => {
    if (step === 0) return data.studyArea !== "";
    if (step === 1) return data.objective !== "";
    if (step === 2) return data.preferredTimes.length > 0;
    if (step === 4) return data.firstAction !== "";
    return true;
  };

  // ── Loading while restoring progress ───────────────────────
  if (restoring) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
        role="status"
        aria-label="Carregando configurações salvas"
      >
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-2" role="progressbar" aria-label="Progresso do carregamento">
            {steps.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full bg-white/[0.04]" />
            ))}
          </div>
          <div className="h-8 w-48 rounded bg-white/[0.04] animate-pulse mx-auto" />
          <div className="h-4 w-64 rounded bg-white/[0.02] animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 page-enter"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2" role="progressbar" aria-label={`Passo ${step + 1} de ${steps.length}`}>
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{
              background: i <= step
                ? "linear-gradient(90deg, var(--gold-dark), var(--gold))"
                : "var(--border)",
            }} />
          ))}
        </div>

        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "var(--gold)" }}>
            Passo {step + 1} de {steps.length}
          </p>
          <h2 className="text-2xl font-serif font-bold text-white">{steps[step].title}</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{steps[step].desc}</p>
        </div>

        {/* Step Content */}
        <div className="space-y-3 stagger-children" role="group" aria-label={steps[step].title}>
          {/* Step 0: Study Area */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {STUDY_AREAS.map((area) => (
                <button key={area.id}
                  onClick={() => setData({ ...data, studyArea: area.id })}
                  aria-label={`Selecionar área: ${area.label}`}
                  aria-pressed={data.studyArea === area.id}
                  className={clsx(
                    "p-4 rounded-2xl text-center transition-all duration-200 hover:scale-[1.02] min-h-[44px]",
                    data.studyArea === area.id ? undefined : "glass"
                  )}
                  style={data.studyArea === area.id ? {
                    background: `${area.color}12`,
                    border: `1px solid ${area.color}30`,
                  } : undefined}>
                  <area.icon size={28} className="mx-auto mb-2" style={{ color: area.color }} />
                  <p className="text-sm font-medium text-white">{area.label}</p>
                  {data.studyArea === area.id && (
                    <CheckCircle2 size={14} className="mx-auto mt-1" style={{ color: area.color }} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Objective */}
          {step === 1 && (
            <div className="space-y-2">
              {OBJECTIVES.map((obj) => (
                <button key={obj.id}
                  onClick={() => setData({ ...data, objective: obj.id })}
                  aria-label={`Selecionar objetivo: ${obj.label} - ${obj.desc}`}
                  aria-pressed={data.objective === obj.id}
                  className={clsx(
                    "w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3 min-h-[44px]",
                    data.objective === obj.id ? undefined : "glass"
                  )}
                  style={data.objective === obj.id ? {
                    background: "var(--gold-glow)",
                    border: "1px solid var(--gold-border)",
                  } : undefined}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{obj.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{obj.desc}</p>
                  </div>
                  {data.objective === obj.id && <CheckCircle2 size={18} style={{ color: "var(--gold)" }} />}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Preferred Times */}
          {step === 2 && (
            <div className="space-y-2">
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Selecione um ou mais horários</p>
              {TIME_OPTIONS.map((time) => {
                const isSelected = data.preferredTimes.includes(time.id);
                return (
                  <button key={time.id}
                    onClick={() => {
                      const times = isSelected
                        ? data.preferredTimes.filter((t) => t !== time.id)
                        : [...data.preferredTimes, time.id];
                      setData({ ...data, preferredTimes: times });
                    }}
                    aria-label={`${isSelected ? "Remover" : "Adicionar"} horário: ${time.label} (${time.time})`}
                    aria-pressed={isSelected}
                    className={clsx(
                      "w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3 min-h-[44px]",
                      isSelected ? undefined : "glass"
                    )}
                    style={isSelected ? {
                      background: `${time.color}10`,
                      border: `1px solid ${time.color}30`,
                    } : undefined}>
                    <time.icon size={20} style={{ color: time.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{time.label}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Notificação às {time.time}</p>
                    </div>
                    {isSelected && <CheckCircle2 size={18} style={{ color: time.color }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 3: Frequency */}
          {step === 3 && (
            <div className="space-y-2">
              {FREQUENCIES.map((freq) => (
                <button key={freq.id}
                  onClick={() => setData({ ...data, frequency: freq.id })}
                  aria-label={`Selecionar frequência: ${freq.label} - ${freq.desc}${freq.recommended ? " (Recomendado)" : ""}`}
                  aria-pressed={data.frequency === freq.id}
                  className={clsx(
                    "w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3 min-h-[44px]",
                    data.frequency === freq.id ? undefined : "glass"
                  )}
                  style={data.frequency === freq.id ? {
                    background: "var(--gold-glow)",
                    border: "1px solid var(--gold-border)",
                  } : undefined}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{freq.label}</p>
                      {freq.recommended && (
                        <span className="badge text-[9px]" style={{ background: "var(--gold-glow)", color: "var(--gold)" }}>
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{freq.desc}</p>
                  </div>
                  {data.frequency === freq.id && <CheckCircle2 size={18} style={{ color: "var(--gold)" }} />}
                </button>
              ))}
            </div>
          )}

          {/* Step 4: First Action */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Escolha por onde começar sua jornada</p>
              {FIRST_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.id}
                    onClick={() => setData({ ...data, firstAction: action.id })}
                    aria-label={`Selecionar primeira ação: ${action.label}`}
                    aria-pressed={data.firstAction === action.id}
                    className={clsx(
                      "w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3 min-h-[44px]",
                      data.firstAction === action.id ? undefined : "glass"
                    )}
                    style={data.firstAction === action.id ? {
                      background: `${action.color}10`,
                      border: `1px solid ${action.color}30`,
                    } : undefined}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${action.color}15` }}>
                      <Icon size={20} style={{ color: action.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{action.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{action.desc}</p>
                    </div>
                    {data.firstAction === action.id && <CheckCircle2 size={18} style={{ color: action.color }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => goToStep(step - 1)}
              aria-label="Voltar ao passo anterior"
              className="glass flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px]"
              style={{ color: "var(--text-muted)" }}>
              <ChevronLeft size={14} /> Voltar
            </button>
          )}
          {step < steps.length - 1 ? (
            <button onClick={() => goToStep(step + 1)} disabled={!canProceed()}
              aria-label={canProceed() ? "Ir para o próximo passo" : "Selecione uma opção para continuar"}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleComplete} disabled={loading || !canProceed()}
              aria-label={loading ? "Salvando configuração" : "Finalizar configuração"}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Salvando..." : "Começar! 🚀"} <Sparkles size={14} />
            </button>
          )}
        </div>

        {/* Skip link */}
        <p className="text-center">
          <button onClick={() => window.location.href = "/"}
            aria-label="Pular configuração e ir direto ao app"
            className="text-xs hover:underline min-h-[44px] inline-flex items-center"
            style={{ color: "var(--text-secondary)" }}>
            Pular configuração e ir direto ao app →
          </button>
        </p>
      </div>
    </div>
  );
}
