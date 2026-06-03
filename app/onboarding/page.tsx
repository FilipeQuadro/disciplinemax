"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { EVENT_TYPES } from "@/lib/repositories/event-tracking-repository";
import {
  BookOpen, BookMarked, Timer, Target, Sparkles, ChevronRight,
  ChevronLeft, CheckCircle2, Clock, Calendar, Sun, Moon, Zap
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────
interface OnboardingData {
  studyArea: string;
  objective: string;
  preferredTimes: string[];
  frequency: string;
}

const STUDY_AREAS = [
  { id: "theology", label: "Teologia", icon: BookMarked, color: "#D4AF37" },
  { id: "devotional", label: "Devocional", icon: Sparkles, color: "#7C6BBD" },
  { id: "academic", label: "Acadêmico", icon: BookOpen, color: "#3ABAB4" },
  { id: "personal", label: "Pessoal", icon: Target, color: "#E8844A" },
];

const OBJECTIVES = [
  { id: "discipline", label: "Disciplina diária", desc: "Criar hábito de leitura consistente" },
  { id: "study", label: "Estudo profundo", desc: "Aprofundar conhecimento em uma área" },
  { id: "balance", label: "Equilíbrio", desc: "Conciliar leitura, bíblia e foco" },
  { id: "productivity", label: "Produtividade", desc: "Maximizar o tempo de estudo" },
];

const TIME_OPTIONS = [
  { id: "morning", label: "Manhã", time: "07:00", icon: Sun, color: "#D4AF37" },
  { id: "afternoon", label: "Tarde", time: "12:00", icon: Zap, color: "#E8844A" },
  { id: "evening", label: "Noite", time: "19:00", icon: Moon, color: "#7C6BBD" },
];

const FREQUENCIES = [
  { id: "daily", label: "Todo dia", desc: "Máxima consistência", recommended: true },
  { id: "weekdays", label: "Dias úteis", desc: "Segunda a sexta" },
  { id: "3x", label: "3x por semana", desc: "Flexibilidade" },
];

// ── Main Component ─────────────────────────────────────────────
export default function OnboardingPage() {
  const { user } = useAuth();
  const { setSettings } = useStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    studyArea: "",
    objective: "",
    preferredTimes: [],
    frequency: "daily",
  });

  const steps = [
    { title: "Área de Estudo", desc: "Qual é o seu foco principal?" },
    { title: "Objetivo", desc: "O que você quer alcançar?" },
    { title: "Horários", desc: "Quando prefere estudar?" },
    { title: "Frequência", desc: "Com que frequência?" },
  ];

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

      // Track onboarding completion event
      try {
        const { getServiceClient } = await import("@/lib/db-client");
        const client = getServiceClient();
        await client.from("product_events").insert({
          user_id: user.id,
          event_type: EVENT_TYPES.ONBOARDING_COMPLETED,
          event_data: {
            study_area: data.studyArea,
            objective: data.objective,
            preferred_times: data.preferredTimes,
            frequency: data.frequency,
          },
        });
      } catch { /* best effort */ }

      toast.success("Configuração concluída! Bem-vindo ao DisciplinaMax 🎉");

      // Redirect to dashboard
      window.location.href = "/";
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
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0B0E14" }}>
      <div className="w-full max-w-md space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{
              background: i <= step ? "linear-gradient(90deg, #A8892B, #D4AF37)" : "rgba(255,255,255,0.04)",
            }} />
          ))}
        </div>

        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "#D4AF37" }}>
            Passo {step + 1} de {steps.length}
          </p>
          <h2 className="text-2xl font-serif font-bold text-white">{steps[step].title}</h2>
          <p className="text-sm mt-1" style={{ color: "#8B95A5" }}>{steps[step].desc}</p>
        </div>

        {/* Step Content */}
        <div className="space-y-3">
          {/* Step 0: Study Area */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {STUDY_AREAS.map((area) => (
                <button key={area.id} onClick={() => setData({ ...data, studyArea: area.id })}
                  className={clsx("p-4 rounded-2xl text-center transition-all duration-200 hover:scale-[1.02]")}
                  style={{
                    background: data.studyArea === area.id ? `${area.color}12` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${data.studyArea === area.id ? `${area.color}30` : "rgba(255,255,255,0.05)"}`,
                  }}>
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
                <button key={obj.id} onClick={() => setData({ ...data, objective: obj.id })}
                  className="w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3"
                  style={{
                    background: data.objective === obj.id ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${data.objective === obj.id ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.05)"}`,
                  }}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{obj.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#555E6E" }}>{obj.desc}</p>
                  </div>
                  {data.objective === obj.id && <CheckCircle2 size={18} style={{ color: "#D4AF37" }} />}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Preferred Times */}
          {step === 2 && (
            <div className="space-y-2">
              <p className="text-xs mb-2" style={{ color: "#555E6E" }}>Selecione um ou mais horários</p>
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
                    className="w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3"
                    style={{
                      background: isSelected ? `${time.color}10` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isSelected ? `${time.color}30` : "rgba(255,255,255,0.05)"}`,
                    }}>
                    <time.icon size={20} style={{ color: time.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{time.label}</p>
                      <p className="text-xs" style={{ color: "#555E6E" }}>Notificação às {time.time}</p>
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
                <button key={freq.id} onClick={() => setData({ ...data, frequency: freq.id })}
                  className="w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3"
                  style={{
                    background: data.frequency === freq.id ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${data.frequency === freq.id ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.05)"}`,
                  }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{freq.label}</p>
                      {freq.recommended && (
                        <span className="badge text-[9px]" style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37" }}>
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#555E6E" }}>{freq.desc}</p>
                  </div>
                  {data.frequency === freq.id && <CheckCircle2 size={18} style={{ color: "#D4AF37" }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "#8B95A5" }}>
              <ChevronLeft size={14} /> Voltar
            </button>
          )}
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: canProceed() ? "linear-gradient(135deg, #A8892B, #D4AF37)" : "rgba(255,255,255,0.03)",
                color: canProceed() ? "#0B0E14" : "#555E6E",
                opacity: canProceed() ? 1 : 0.5,
              }}>
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleComplete} disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #A8892B, #D4AF37)",
                color: "#0B0E14",
              }}>
              {loading ? "Salvando..." : "Começar! 🚀"} <Sparkles size={14} />
            </button>
          )}
        </div>

        {/* Skip link */}
        <p className="text-center">
          <button onClick={() => window.location.href = "/"}
            className="text-xs hover:underline" style={{ color: "#555E6E" }}>
            Pagar configuração e ir direto ao app →
          </button>
        </p>
      </div>
    </div>
  );
}
