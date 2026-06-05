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
  iconColor = "#6B7585",
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="card text-center py-12">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: `${iconColor}10` }}>
        <Icon size={32} style={{ color: iconColor }} />
      </div>
      <h3 className="text-lg font-serif font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm max-w-xs mx-auto" style={{ color: "#8B95A5" }}>{description}</p>
      {primaryAction && (
        <Link href={primaryAction.href}
          className="btn-primary mt-5 inline-flex text-sm">
          {primaryAction.label}
        </Link>
      )}
      {secondaryAction && (
        <Link href={secondaryAction.href}
          className="block mt-3 text-xs hover:underline" style={{ color: "#6B7585" }}>
          {secondaryAction.label}
        </Link>
      )}
    </div>
  );
}