"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dataFetch } from "@/lib/data-fetch";
import { PLAN_LIMITS, type PlanType } from "@/lib/plans";
import { Crown, Infinity } from "lucide-react";

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

  const limits = PLAN_LIMITS[currentPlan];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Crown size={24} style={{ color: "#D4AF37" }} /> Planos
        </h1>
        <p className="text-sm mt-1" style={{ color: "#555E6E" }}>Seu plano atual</p>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{
          background: `linear-gradient(145deg, ${limits.color}08, rgba(20,24,32,0.9))`,
          border: `1px solid ${limits.color}30`,
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <h3 className="font-serif font-bold text-lg" style={{ color: limits.color }}>
            {limits.label}
          </h3>
          <span className="badge text-[10px]" style={{ background: `${limits.color}15`, color: limits.color }}>
            Atual
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Livros ativos", value: "∞" },
            { label: "Pomodoros/dia", value: "∞" },
            { label: "Relatório semanal", value: "✓" },
            { label: "Sons ambiente", value: "3" },
            { label: "AI motivação/dia", value: "∞" },
            { label: "Streak freeze/mês", value: "∞" },
          ].map((feat, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
              <span className="text-xs" style={{ color: "#8B95A5" }}>{feat.label}</span>
              <span className="text-sm font-medium" style={{ color: feat.value === "✓" ? "#3ABAB4" : "#F0F0F0" }}>
                {feat.value === "∞" ? <Infinity size={16} style={{ color: "#3ABAB4" }} /> : feat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
