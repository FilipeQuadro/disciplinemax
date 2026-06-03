"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { Download, X, Smartphone } from "lucide-react";

export function PwaInstallListener() {
  const setPwaInstallPrompt = useStore((s) => s.setPwaInstallPrompt);
  const [showBanner, setShowBanner] = useState(false);
  const [deferredEvent, setDeferredEvent] = useState<Event | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
      setDeferredEvent(e);

      // Show banner only if not dismissed recently
      const dismissed = localStorage.getItem("pwa-banner-dismissed");
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowBanner(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [setPwaInstallPrompt]);

  async function handleInstall() {
    if (!deferredEvent) return;
    const prompt = deferredEvent as any;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredEvent(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", String(Date.now()));
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80 animate-slide-up">
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(145deg, rgba(20,24,32,0.95), rgba(20,24,32,0.98))",
          border: "1px solid rgba(212,175,55,0.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
        }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #A8892B, #D4AF37)" }}>
          <Smartphone size={18} className="text-[#0B0E14]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Instalar DisciplinaMax</p>
          <p className="text-xs" style={{ color: "#8B95A5" }}>Acesse rápido, offline e notificações</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleInstall}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
            style={{ background: "linear-gradient(135deg, #A8892B, #D4AF37)" }}>
            <Download size={14} className="text-[#0B0E14]" />
          </button>
          <button onClick={handleDismiss}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555E6E" }}>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
