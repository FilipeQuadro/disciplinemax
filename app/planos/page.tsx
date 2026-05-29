"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dataFetch } from "@/lib/data-fetch";
import { PLAN_LIMITS, canDoAction, type PlanType } from "@/lib/plans";
import { Crown, Check, Lock } from "lucide-react";

const InfinityIcon = () => <span style={{ color: "#3ABAB4" }}>∞</span>;

const ALL_PLANS: PlanType[] = ["free", "pro", "premium"];

function formatLimit(value: number): string {
  return value === Infinity ? "∞" : String(value);
}

export default function PlanosPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<PlanType>("free");

  useEffect(() => {
    if (user) {
      dataFetch({ action: "select", table: "user_plans", filters: { eq: { user_id: user.id }, maybeSingle: true, select: "plan" } })
        .then(({ data }) => setCurrentPlan(((data as any)?.plan as PlanType) || "free"))
        .catch(() => setCurrentPlan("free"));
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Crown size={24} style={{ color: "#D4AF37" }} /> Planos
        </h1>
        <p className="text-sm mt-1" style={{ color: "#555E6E" }}>Compare os planos e escolha o ideal para você</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ALL_PLANS.map((plan) => {
          const limits = PLAN_LIMITS[plan];
          const isCurrent = plan === currentPlan;
          const features = [
            { label: "Livros ativos", value: limits.maxBooks },
            { label: "Pomodoros/dia", value: limits.maxPomodorosPerDay },
            { label: "Relatório semanal", value: limits.weeklyReport },
            { label: "Sons ambiente", value: limits.ambientSounds },
            { label: "AI motivação/dia", value: limits.aiMotivationPerDay },
            { label: "Streak freeze/mês", value: limits.streakFreezePerMonth },
          ];

          return (
            <div
              key={plan}
              className="rounded-2xl p-6 relative transition-all duration-300"
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
                <Crown size={20} style={{ color: limits.color }} />
                <h3 className="font-serif font-bold text-lg text-white">{limits.label}</h3>
              </div>

              <p className="text-2xl font-bold mb-5" style={{ color: limits.color }}>{limits.price}</p>

              <div className="space-y-3">
                {features.map((feat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#8B95A5" }}>{feat.label}</span>
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
                  className="w-full mt-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
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
    </div>
  );
}
