"use client";

import { AlertCircle } from "lucide-react";

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorCard({
  title = "Erro ao carregar",
  message = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
}: ErrorCardProps) {
  return (
    <div className="card text-center py-16">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(217,79,79,0.08)" }}>
        <AlertCircle size={32} style={{ color: "var(--danger)" }} />
      </div>
      <h3 className="text-lg font-serif font-semibold tracking-tight text-white mb-2">{title}</h3>
      <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary mt-6 text-sm active:scale-[0.98] transition-transform duration-150"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
