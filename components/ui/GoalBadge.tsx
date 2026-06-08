"use client";

import { Check } from "lucide-react";

interface GoalBadgeProps {
  met: boolean;
  metLabel?: string;
  unmetLabel?: string;
}

export function GoalBadge({
  met,
  metLabel = "Meta atingida!",
  unmetLabel,
}: GoalBadgeProps) {
  if (met) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-xl pulse-glow"
        style={{
          background: "rgba(58,186,180,0.08)",
          border: "1px solid rgba(58,186,180,0.15)",
        }}
      >
        <Check size={16} style={{ color: "var(--success)" }} />
        <span
          className="text-sm font-medium"
          style={{ color: "var(--success)" }}
        >
          {metLabel}
        </span>
      </div>
    );
  }

  if (unmetLabel) {
    return (
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {unmetLabel}
      </span>
    );
  }

  return null;
}
