"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
}

export function EmptyState({
  icon: Icon,
  iconColor = "var(--text-secondary)",
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="card text-center py-16">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: `${iconColor}10` }}>
        <Icon size={32} style={{ color: iconColor }} />
      </div>
      <h3 className="text-lg font-serif font-semibold tracking-tight text-white mb-2">{title}</h3>
      <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>{description}</p>
      {primaryAction && (
        <Link href={primaryAction.href}
          className="btn-primary mt-6 inline-flex text-sm active:scale-[0.98] transition-transform duration-150">
          {primaryAction.label}
        </Link>
      )}
      {secondaryAction && (
        <Link href={secondaryAction.href}
          className="block mt-3 text-xs hover:underline transition-opacity duration-150" style={{ color: "var(--text-secondary)" }}>
          {secondaryAction.label}
        </Link>
      )}
    </div>
  );
}