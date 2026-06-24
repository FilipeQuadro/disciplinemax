"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dataFetch } from "@/lib/data-fetch";
import { PLAN_LIMITS, canDoAction, type PlanType } from "@/lib/plans";
import { Crown, Check, Lock, Zap, BookOpen, Timer, Sparkles, Shield, Star, Flame } from "lucide-react";
import { clsx } from "clsx";
import { HeroHeader } from "@/components/ui/HeroHeader";
import { GradientCard } from "@/components/ui/GradientCard";
import { Badge } from "@/components/ui/Badge";
import { SkeletonPage } from "@/components/Skeleton";

const InfinityIcon = () => <span style={{ color: "var(--accent-teal)" }}>∞</span>;

const ALL_PLANS: PlanType[] = ["free", "pro", "premium"];

function formatLimit(value: number): string {
  return value === Infinity ? "∞" : String(value);
}

const planVariant: Record<PlanType, "gold" | "purple" | "teal" | "orange" | "red"> = {
  free: "teal",
  pro: "purple",
  premium: "gold",
};

const planCssVar: Record<PlanType, string> = {
  free: "var(--text-muted)",
  pro: "var(--accent-purple)",
  premium: "var(--gold)",
};

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
    return <SkeletonPage className="!space-y-6" />;
  }

  return (
    <div className="space-y-8 page-enter">
      {/* Hero Header */}
      <HeroHeader title="Planos" icon={Crown} iconColor="var(--gold)" />

      {/* Current Plan Banner */}
      <div
        className="rounded-2xl p-5 flex items-center gap-4 shimmer"
        style={{
          background: `linear-gradient(145deg, ${PLAN_LIMITS[currentPlan].color}08, rgba(20,24,32,0.9))`,
          border: `1px solid ${PLAN_LIMITS[currentPlan].color}25`,
        }}
      >
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `${PLAN_LIMITS[currentPlan].color}15`,
            boxShadow: `0 0 20px ${PLAN_LIMITS[currentPlan].color}15`,
          }}
        >
          <Crown size={28} style={{ color: planCssVar[currentPlan] }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            Plano atual: <span style={{ color: planCssVar[currentPlan] }}>{PLAN_LIMITS[currentPlan].label}</span>
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {currentPlan === "free"
              ? "Faça upgrade para desbloquear mais recursos"
              : currentPlan === "pro"
                ? "Você tem acesso a recursos avançados"
                : "Acesso total a todos os recursos"}
          </p>
        </div>
        {currentPlan !== "premium" && (
          <Badge variant="premium" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold">
            Upgrade disponível
          </Badge>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
        {ALL_PLANS.map((plan) => {
          const limits = PLAN_LIMITS[plan];
          const isCurrent = plan === currentPlan;
          const variant = planVariant[plan];
          const features = [
            { label: "Livros ativos", value: limits.maxBooks, icon: <BookOpen size={12} /> },
            { label: "Pomodoros/dia", value: limits.maxPomodorosPerDay, icon: <Timer size={12} /> },
            { label: "Relatório semanal", value: limits.weeklyReport, icon: <Zap size={12} /> },
            { label: "Sons ambiente", value: limits.ambientSounds, icon: <Sparkles size={12} /> },
            { label: "AI motivação/dia", value: limits.aiMotivationPerDay, icon: <Star size={12} /> },
            { label: "Streak freeze/mês", value: limits.streakFreezePerMonth, icon: <Shield size={12} /> },
          ];

          return (
            <GradientCard
              key={plan}
              variant={variant}
              className={clsx(
                "relative transition-all duration-300 glow-border p-6",
                isCurrent && "shimmer",
              )}
            >
              {isCurrent && (
                <Badge variant="premium" className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full text-[10px] font-semibold">
                  Atual
                </Badge>
              )}

              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${limits.color}15` }}
                >
                  <Crown size={20} style={{ color: planCssVar[plan] }} />
                </div>
                <h3 className="font-serif font-semibold tracking-tight text-lg text-white">{limits.label}</h3>
              </div>

              <p className="text-2xl font-semibold tracking-tight mb-5" style={{ color: planCssVar[plan] }}>
                {limits.price}
              </p>

              <div className="space-y-3">
                {features.map((feat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: `${limits.color}80` }}>{feat.icon}</span> {feat.label}
                    </span>
                    {typeof feat.value === "boolean" ? (
                      feat.value ? (
                        <Check size={14} style={{ color: "var(--accent-teal)" }} />
                      ) : (
                        <Lock size={14} style={{ color: "var(--text-secondary)" }} />
                      )
                    ) : feat.value === Infinity ? (
                      <InfinityIcon />
                    ) : (
                      <span className="text-sm font-semibold text-white">{feat.value}</span>
                    )}
                  </div>
                ))}
              </div>

              {!isCurrent && (
                <button className="btn-ghost w-full mt-6 py-2.5">
                  {plan === "free" ? "Downgrade" : "Upgrade"}
                </button>
              )}
            </GradientCard>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <GradientCard variant="gold" className="shimmer">
        <h3 className="font-semibold tracking-tight text-white mb-4 flex items-center gap-2">
          <Zap size={16} style={{ color: "var(--gold)" }} /> Por que fazer upgrade?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GradientCard variant="purple" className="!p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[var(--accent-purple)]/10">
              <BookOpen size={18} className="text-[--accent-purple]" />
            </div>
            <p className="text-sm font-semibold text-white">Mais livros</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              De 5 para 20 livros ou ilimitados no Premium
            </p>
          </GradientCard>
          <GradientCard variant="teal" className="!p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[var(--accent-teal)]/10">
              <Sparkles size={18} className="text-[--accent-teal]" />
            </div>
            <p className="text-sm font-semibold text-white">IA ilimitada</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Mensagens motivacionais personalizadas sem limite
            </p>
          </GradientCard>
          <GradientCard variant="gold" className="!p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[var(--gold)]/10">
              <Shield size={18} className="text-[--gold]" />
            </div>
            <p className="text-sm font-semibold text-white">Streak Freeze</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Proteja seu streak em dias difíceis
            </p>
          </GradientCard>
        </div>
      </GradientCard>
    </div>
  );
}
