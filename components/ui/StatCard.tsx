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
    <div className={`stat-card ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.15em]"
          style={{ color }}
        >
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}10` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white count-up">{value}</p>
    </div>
  );
}
