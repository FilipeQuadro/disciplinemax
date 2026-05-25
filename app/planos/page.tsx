"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { PLAN_LIMITS, type PlanType } from "@/lib/plans";
import { Check, X, Crown, Zap, FlameKindling } from "lucide-react";
import { clsx } from "clsx";

export default function PlanosPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<PlanType>("free");

  useEffect(() => {
    if (user && supabase) {
      (supabase.from("user_plans") as any).select("plan").eq("user_id", user.id).maybeSingle()
        .then(({ data }: any) => setCurrentPlan((data?.plan as PlanType) || "free"));
    }
  }, [user]);

  const plans: PlanType[] = ["free", "pro", "premium"];

  return (
    <div className="space-y-6 page-enter stagger-children">
      <div>
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Crown size={24} style={{ color: "#D4AF37" }} /> Planos
        </h1>
        <p className="text-sm mt-1" style={{ color: "#555E6E" }}>Escolha o plano ideal para sua jornada</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const limits = PLAN_LIMITS[plan];
          const isCurrent = currentPlan === plan;
          return (
            <div
              key={plan}
              className={clsx("rounded-2xl p-6 transition-all duration-300", isCurrent && "ring-1")}
              style={{
                background: isCurrent
                  ? `linear-gradient(145deg, ${limits.color}08, rgba(20,24,32,0.9))`
                  : "rgba(255,255,255,0.02)",
                border: isCurrent ? `1px solid ${limits.color}30` : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif font-bold text-lg" style={{ color: limits.color }}>{limits.label}</h3>
                  <p className="text-xs" style={{ color: "#555E6E" }}>{limits.price}</p>
                </div>
                {isCurrent && (
                  <span className="badge text-[10px]" style={{ background: `${limits.color}15`, color: limits.color }}>
                    Atual
                  </span>
                )}
              </div>

              <div className="space-y-3 mt-6">
                {[
                  { label: "Livros ativos", value: limits.maxBooks === Infinity ? "∞" : `${limits.maxBooks}` },
                  { label: "Pomodoros/dia", value: limits.maxPomodorosPerDay === Infinity ? "∞" : `${limits.maxPomodorosPerDay}` },
                  { label: "Relatório semanal", value: limits.weeklyReport },
                  { label: "Sons ambiente", value: `${limits.ambientSounds}` },
                  { label: "AI motivação/dia", value: limits.aiMotivationPerDay === Infinity ? "∞" : `${limits.aiMotivationPerDay}` },
                  { label: "Streak freeze/mês", value: limits.streakFreezePerMonth === Infinity ? "∞" : `${limits.streakFreezePerMonth}` },
                ].map((feat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#8B95A5" }}>{feat.label}</span>
                    <span className="text-xs font-medium" style={{ color: typeof feat.value === "boolean" ? (feat.value ? "#3ABAB4" : "#555E6E") : "#F0F0F0" }}>
                      {typeof feat.value === "boolean" ? (
                        feat.value ? <Check size={14} style={{ color: "#3ABAB4" }} /> : <X size={14} style={{ color: "#555E6E" }} />
                      ) : feat.value}
                    </span>
                  </div>
                ))}
              </div>

              <button
                disabled={isCurrent}
                className={clsx("w-full mt-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300", isCurrent ? "cursor-default" : "hover:scale-[1.02] active:scale-95")}
                style={isCurrent ? {
                  background: "rgba(255,255,255,0.04)",
                  color: "#555E6E",
                } : {
                  background: `linear-gradient(135deg, ${limits.color}88, ${limits.color})`,
                  color: "#0B0E14",
                  boxShadow: `0 4px 20px ${limits.color}30`,
                }}
              >
                {isCurrent ? "Plano Atual" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
