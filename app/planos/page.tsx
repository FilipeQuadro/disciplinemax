"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dataFetch } from "@/lib/data-fetch";
import { PLAN_LIMITS, canDoAction, type PlanType } from "@/lib/plans";
import { Crown, Check, Lock, Zap, BookOpen, Timer, Sparkles, Shield, Star, Flame } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const InfinityIcon = () => <span style={{ color: "#3ABAB4" }}>∞</span>;

const ALL_PLANS: PlanType[] = ["free", "pro", "premium"];

function formatLimit(value: number): string {
  return value === Infinity ? "∞" : String(value);
}

export default function PlanosPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<PlanType>("free");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user) {
      dataFetch({ action: "select", table: "user_plans", filters: { eq: { user_id: user.id }, maybeSingle: true, select: "plan" } })
        .then(({ data }) => setCurrentPlan(((data as any)?.plan as PlanType) || "free"))
        .catch(() => setCurrentPlan("free"));
    }
  }, [user]);

  // ─── Loading Skeleton ──────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-64 rounded bg-white/5" />
        <div className="h-3 w-48 rounded bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-2xl bg-white/[0.02]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Hero Header */}
      <div>
        <p className="text-xs mb-1" style={{ color: "#555E6E" }}>
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Crown size={24} style={{ color: "#D4AF37" }} /> Planos
        </h1>
      </div>

      {/* Current Plan Banner */}
      <div className="rounded-2xl p-5 flex items-center gap-4 shimmer"
        style={{
          background: `linear-gradient(145deg, ${PLAN_LIMITS[currentPlan].color}08, rgba(20,24,32,0.9))`,
          border: `1px solid ${PLAN_LIMITS[currentPlan].color}25`,
        }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${PLAN_LIMITS[currentPlan].color}15`, boxShadow: `0 0 20px ${PLAN_LIMITS[currentPlan].color}15` }}>
          <Crown size={28} style={{ color: PLAN_LIMITS[currentPlan].color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Plano atual: <span style={{ color: PLAN_LIMITS[currentPlan].color }}>{PLAN_LIMITS[currentPlan].label}</span></p>
          <p className="text-xs" style={{ color: "#555E6E" }}>
            {currentPlan === "free" ? "Faça upgrade para desbloquear mais recursos" : currentPlan === "pro" ? "Você tem acesso a recursos avançados" : "Acesso total a todos os recursos"}
          </p>
        </div>
        {currentPlan !== "premium" && (
          <div className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: `${PLAN_LIMITS[currentPlan].color}12`, color: PLAN_LIMITS[currentPlan].color }}>
            Upgrade disponível
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
        {ALL_PLANS.map((plan) => {
          const limits = PLAN_LIMITS[plan];
          const isCurrent = plan === currentPlan;
          const features = [
            { label: "Livros ativos", value: limits.maxBooks, icon: <BookOpen size={12} /> },
            { label: "Pomodoros/dia", value: limits.maxPomodorosPerDay, icon: <Timer size={12} /> },
            { label: "Relatório semanal", value: limits.weeklyReport, icon: <Zap size={12} /> },
            { label: "Sons ambiente", value: limits.ambientSounds, icon: <Sparkles size={12} /> },
            { label: "AI motivação/dia", value: limits.aiMotivationPerDay, icon: <Star size={12} /> },
            { label: "Streak freeze/mês", value: limits.streakFreezePerMonth, icon: <Shield size={12} /> },
          ];

          return (
            <div
              key={plan}
              className={clsx("rounded-2xl p-6 relative transition-all duration-300 glow-border", isCurrent && "shimmer")}
              style={{
                background: `linear-gradient(145deg, ${limits.color}08, rgba(20,24,32,0.9))`,
                border: `1px solid ${limits.color}${isCurrent ? "40" : "15"}`,
                boxShadow: isCurrent ? `0 0 30px ${limits.color}15` : "none",
              }}
            >
              {isCurrent && (
                <div className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: limits.color, color: "#0B0E14" }}>
                  Atual
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${limits.color}15` }}>
                  <Crown size={20} style={{ color: limits.color }} />
                </div>
                <h3 className="font-serif font-bold text-lg text-white">{limits.label}</h3>
              </div>

              <p className="text-2xl font-bold mb-5" style={{ color: limits.color }}>{limits.price}</p>

              <div className="space-y-3">
                {features.map((feat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs flex items-center gap-1.5" style={{ color: "#8B95A5" }}>
                      <span style={{ color: `${limits.color}80` }}>{feat.icon}</span> {feat.label}
                    </span>
                    {typeof feat.value === "boolean" ? (
                      feat.value ? <Check size={14} style={{ color: "#3ABAB4" }} /> : <Lock size={14} style={{ color: "#555E6E" }} />
                    ) : feat.value === Infinity ? (
                      <InfinityIcon />
                    ) : (
                      <span className="text-sm font-semibold text-white">{feat.value}</span>
                    )}
                  </div>
                ))}
              </div>

              {!isCurrent && (
                <button
                  className="w-full mt-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: `${limits.color}12`,
                    border: `1px solid ${limits.color}25`,
                    color: limits.color,
                  }}
                >
                  {plan === "free" ? "Downgrade" : "Upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <div className="card shimmer">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={16} style={{ color: "#D4AF37" }} /> Por que fazer upgrade?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ background: "rgba(124,107,189,0.04)", border: "1px solid rgba(124,107,189,0.1)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "rgba(124,107,189,0.1)" }}>
              <BookOpen size={18} style={{ color: "#7C6BBD" }} />
            </div>
            <p className="text-sm font-semibold text-white">Mais livros</p>
            <p className="text-xs mt-1" style={{ color: "#555E6E" }}>De 5 para 20 livros ou ilimitados no Premium</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: "rgba(58,186,180,0.04)", border: "1px solid rgba(58,186,180,0.1)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "rgba(58,186,180,0.1)" }}>
              <Sparkles size={18} style={{ color: "#3ABAB4" }} />
            </div>
            <p className="text-sm font-semibold text-white">IA ilimitada</p>
            <p className="text-xs mt-1" style={{ color: "#555E6E" }}>Mensagens motivacionais personalizadas sem limite</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "rgba(212,175,55,0.1)" }}>
              <Shield size={18} style={{ color: "#D4AF37" }} />
            </div>
            <p className="text-sm font-semibold text-white">Streak Freeze</p>
            <p className="text-xs mt-1" style={{ color: "#555E6E" }}>Proteja seu streak em dias difíceis</p>
          </div>
        </div>
      </div>
    </div>
  );
}
