"use client";

import { useEffect, useState, useRef } from "react";
import { FlameKindling } from "lucide-react";

// Safe AudioContext creation — returns null on failure
function createSafeAudioContext(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  } catch {
    return null;
  }
}

// Bell-like chime — bright, welcoming. Plays when the intro fades out.
function playIntroChime() {
  try {
    const ctx = createSafeAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 880, gain: 0.15, start: 0, dur: 0.6 },
      { freq: 1320, gain: 0.08, start: 0.02, dur: 0.5 },
      { freq: 1760, gain: 0.04, start: 0.04, dur: 0.4 },
      { freq: 660, gain: 0.1, start: 0.15, dur: 0.8 },
    ];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, now + n.start);
      g.gain.setValueAtTime(0, now + n.start);
      g.gain.linearRampToValueAtTime(n.gain, now + n.start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.05);
    }

    setTimeout(() => {
      try { ctx.close(); } catch { /* silent */ }
    }, 2000);
  } catch { /* silent — audio is optional */ }
}

// Gate sound — deep metallic groan
function playGateSound() {
  try {
    const ctx = createSafeAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const groan = ctx.createOscillator();
    const groanGain = ctx.createGain();
    const groanFilter = ctx.createBiquadFilter();
    groan.type = "sawtooth";
    groan.frequency.setValueAtTime(55, now);
    groan.frequency.linearRampToValueAtTime(35, now + 1.2);
    groanFilter.type = "lowpass";
    groanFilter.frequency.setValueAtTime(200, now);
    groanFilter.frequency.linearRampToValueAtTime(120, now + 1.2);
    groanFilter.Q.setValueAtTime(5, now);
    groanGain.gain.setValueAtTime(0.08, now);
    groanGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    groan.connect(groanFilter);
    groanFilter.connect(groanGain);
    groanGain.connect(ctx.destination);
    groan.start(now);
    groan.stop(now + 1.5);

    setTimeout(() => {
      try { ctx.close(); } catch { /* silent */ }
    }, 2000);
  } catch { /* silent — audio is optional */ }
}

export { playGateSound, playIntroChime };

const INTRO_DURATION = 2800;
const INTRO_MAX_DURATION = 4000;
const FADE_DURATION = 800;

export function IntroScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [serverStatus, setServerStatus] = useState<"loading" | "ready" | "waking">("loading");
  const dismissed = useRef(false);
  const audioUnlocked = useRef(false);

  // Unlock audio on first user gesture (required by iOS/Android)
  useEffect(() => {
    function unlock() {
      audioUnlocked.current = true;
      playGateSound();
      document.removeEventListener("touchend", unlock);
      document.removeEventListener("click", unlock);
    }
    document.addEventListener("touchend", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchend", unlock);
      document.removeEventListener("click", unlock);
    };
  }, []);

  useEffect(() => {
    if (!audioUnlocked.current) playGateSound();

    // Check if server is responsive (detect cold starts)
    const checkServer = async () => {
      try {
        const start = Date.now();
        const res = await fetch("/api/health", { cache: "no-store" });
        const elapsed = Date.now() - start;

        if (res.ok) {
          setServerStatus("ready");
          // If server responded fast, normal intro
          if (elapsed < 3000) {
            setTimeout(() => dismiss(), Math.max(0, INTRO_DURATION - elapsed));
          } else {
            // Server was sleeping — dismiss quickly once ready
            setTimeout(() => dismiss(), 600);
          }
        } else {
          // Server responded but with error — still dismiss
          setServerStatus("ready");
          setTimeout(() => dismiss(), INTRO_DURATION);
        }
      } catch {
        // Server is still waking up (Render cold start)
        setServerStatus("waking");
        // Retry every 3 seconds
        const retryInterval = setInterval(async () => {
          try {
            const res = await fetch("/api/health", { cache: "no-store" });
            if (res.ok) {
              setServerStatus("ready");
              clearInterval(retryInterval);
              setTimeout(() => dismiss(), 600);
            }
          } catch {
            // Still waking — keep trying
          }
        }, 3000);
      }
    };

    checkServer();

    // Normal timer (dismisses intro even if health check is slow)
    const normalTimer = setTimeout(() => {
      dismiss();
    }, INTRO_DURATION);

    // Hard fallback
    const maxTimer = setTimeout(() => {
      dismiss();
    }, INTRO_MAX_DURATION);

    return () => {
      clearTimeout(normalTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  function dismiss() {
    if (dismissed.current) return;
    dismissed.current = true;

    try {
      playIntroChime();
    } catch { /* audio is optional */ }

    setFadeOut(true);
    setTimeout(() => setVisible(false), FADE_DURATION);
  }

  if (!visible) return null;

  return (
    <div
      className={`intro-screen ${fadeOut ? "fade-out" : ""}`}
      onClick={dismiss}
      onTouchEnd={dismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") dismiss(); }}
      aria-label="Carregando aplicativo — toque para pular"
      style={{ cursor: "pointer" }}
    >
      <div className="intro-logo">
        <FlameKindling size={32} className="text-[#0B0E14]" />
      </div>
      <p className="intro-title">DisciplinaMax</p>
      <p className="intro-subtitle">Mentor de Disciplina</p>
      <div className="intro-loader">
        <div className="intro-loader-bar" />
      </div>
      {serverStatus === "waking" && (
        <p className="text-[10px] mt-4 tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.4)" }}>
          Servidor está acordando, aguarde...
        </p>
      )}
      {serverStatus === "loading" && (
        <p className="text-[10px] mt-4 tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.15)" }}>
          toque para pular
        </p>
      )}
    </div>
  );
}
