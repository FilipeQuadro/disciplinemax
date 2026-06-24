"use client";

import { useEffect, useState, useRef } from "react";
import { FlameKindling } from "lucide-react";

function createSafeAudioContext(): AudioContext | null {
  try {
    const AC = window.AudioContext;
    const w = window as Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = AC || w.webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  } catch {
    return null;
  }
}

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

const INTRO_DURATION = 2200;
const INTRO_MAX_DURATION = 3000;
const FADE_DURATION = 600;
const INTRO_SEEN_KEY = "disciplina-intro-seen";

export function IntroScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const dismissed = useRef(false);
  const audioUnlocked = useRef(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_SEEN_KEY)) {
        setVisible(false);
        return;
      }
    } catch { /* private browsing */ }

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
    if (!visible) return;

    if (!audioUnlocked.current) playGateSound();

    const normalTimer = setTimeout(() => {
      dismiss();
    }, INTRO_DURATION);

    const maxTimer = setTimeout(() => {
      dismiss();
    }, INTRO_MAX_DURATION);

    return () => {
      clearTimeout(normalTimer);
      clearTimeout(maxTimer);
    };
  }, [visible]);

  function dismiss() {
    if (dismissed.current) return;
    dismissed.current = true;

    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch { /* private browsing */ }

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
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") dismiss(); }}
      aria-label="Carregando aplicativo — toque para pular"
      style={{ cursor: "pointer" }}
    >
      <div className="intro-logo">
        <FlameKindling size={32} className="text-[#0B0E14]" />
      </div>
      <p className="intro-title">DisciplinaApp</p>
      <p className="intro-subtitle">Disciplina & Crescimento</p>
      <div className="intro-loader">
        <div className="intro-loader-bar" />
      </div>
      <p className="text-[10px] mt-4 tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.55)" }}>
        toque para pular
      </p>
    </div>
  );
}
