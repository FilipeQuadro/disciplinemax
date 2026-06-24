"use client";

import { type ReactNode } from "react";

type GradientVariant = "gold" | "purple" | "teal" | "orange" | "red";

interface GradientCardProps {
  variant?: GradientVariant;
  className?: string;
  children: ReactNode;
}

const gradients: Record<GradientVariant, { bg: string; border: string }> = {
  gold: {
    bg: "linear-gradient(145deg, rgba(212,175,55,0.06) 0%, rgba(20,24,32,0.8) 100%)",
    border: "1px solid rgba(212,175,55,0.12)",
  },
  purple: {
    bg: "linear-gradient(145deg, rgba(124,107,189,0.08) 0%, rgba(20,24,32,0.8) 100%)",
    border: "1px solid rgba(124,107,189,0.12)",
  },
  teal: {
    bg: "linear-gradient(145deg, rgba(58,186,180,0.08) 0%, rgba(20,24,32,0.8) 100%)",
    border: "1px solid rgba(58,186,180,0.12)",
  },
  orange: {
    bg: "linear-gradient(145deg, rgba(232,132,74,0.08) 0%, rgba(20,24,32,0.8) 100%)",
    border: "1px solid rgba(232,132,74,0.12)",
  },
  red: {
    bg: "linear-gradient(145deg, rgba(217,79,79,0.08) 0%, rgba(20,24,32,0.8) 100%)",
    border: "1px solid rgba(217,79,79,0.12)",
  },
};

export function GradientCard({
  variant = "gold",
  className = "",
  children,
}: GradientCardProps) {
  const { bg, border } = gradients[variant];

  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-normal hover:-translate-y-px hover:shadow-lg ${className}`}
      style={{ background: bg, border }}
    >
      {children}
    </div>
  );
}
