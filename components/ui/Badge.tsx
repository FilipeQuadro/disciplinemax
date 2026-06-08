"use client";

import { type ReactNode } from "react";

type BadgeVariant = "level" | "xp" | "streak" | "premium" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  level: {
    bg: "rgba(212,175,55,0.1)",
    color: "var(--gold)",
  },
  xp: {
    bg: "rgba(124,107,189,0.1)",
    color: "var(--accent-purple)",
  },
  streak: {
    bg: "rgba(232,132,74,0.1)",
    color: "var(--accent-orange)",
  },
  premium: {
    bg: "rgba(212,175,55,0.12)",
    color: "var(--gold-light)",
  },
  default: {
    bg: "rgba(255,255,255,0.04)",
    color: "var(--text-muted)",
  },
};

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  const { bg, color } = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}
