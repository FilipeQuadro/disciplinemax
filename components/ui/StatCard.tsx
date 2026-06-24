"use client";

import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  value,
  label,
  color,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`stat-card ${className}`}
      style={{
        background: `linear-gradient(145deg, ${color}06, rgba(20,24,32,0.6))`,
        border: `1px solid rgba(255,255,255,0.04)`,
        borderBottom: `2px solid ${color}40`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-semibold tracking-[0.1em] uppercase"
          style={{ color }}
        >
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}14` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-white count-up">{value}</p>
    </div>
  );
}
