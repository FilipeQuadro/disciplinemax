"use client";

import { type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HeroHeaderProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  showDate?: boolean;
}

export function HeroHeader({
  title,
  icon: Icon,
  iconColor = "var(--gold)",
  subtitle,
  showDate = true,
}: HeroHeaderProps) {
  return (
    <div className="space-y-1.5">
      {showDate && (
        <p className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--text-secondary)]">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      )}
      <h1 className="text-3xl font-serif font-semibold tracking-tight text-white flex items-center gap-3">
        {Icon && (
          <span
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${iconColor}12` }}
          >
            <Icon size={18} style={{ color: iconColor }} />
          </span>
        )}
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
