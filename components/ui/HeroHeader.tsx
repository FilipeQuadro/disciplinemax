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
    <div>
      {showDate && (
        <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      )}
      <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
        {Icon && <Icon size={24} style={{ color: iconColor }} />}
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
