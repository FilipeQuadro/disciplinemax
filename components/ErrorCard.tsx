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
    <div className="card text-center py-12">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(217,79,79,0.08)" }}>
        <AlertCircle size={32} style={{ color: "#D94F4F" }} />
      </div>
      <h3 className="text-lg font-serif font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm max-w-xs mx-auto" style={{ color: "#8B95A5" }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary mt-5 text-sm"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}