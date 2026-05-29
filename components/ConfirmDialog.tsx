"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar",
  destructive = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative rounded-2xl p-6 max-w-sm w-full mx-4 animate-slide-up"
        style={{ background: "#141820", border: `1px solid ${destructive ? "rgba(217,79,79,0.2)" : "rgba(212,175,55,0.12)"}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onCancel} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555E6E" }}>
          <X size={16} />
        </button>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: destructive ? "rgba(217,79,79,0.1)" : "rgba(212,175,55,0.08)" }}>
            <AlertTriangle size={18} style={{ color: destructive ? "#D94F4F" : "#D4AF37" }} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{title}</h3>
            <p className="text-sm mt-1" style={{ color: "#8B95A5" }}>{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-ghost text-sm px-4 py-2">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            className="text-sm px-4 py-2 rounded-xl font-medium transition-all duration-200"
            style={destructive
              ? { background: "rgba(217,79,79,0.15)", border: "1px solid rgba(217,79,79,0.2)", color: "#D94F4F" }
              : { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)", color: "#D4AF37" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
