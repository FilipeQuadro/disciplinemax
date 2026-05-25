"use client";

import { useEffect, useState } from "react";
import { FlameKindling } from "lucide-react";

function playIntroChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Bell-like chime: two harmonics with gentle decay
    const notes = [
      { freq: 880, gain: 0.15, start: 0, dur: 0.6 },     // A5 — bright ping
      { freq: 1320, gain: 0.08, start: 0.02, dur: 0.5 },   // E6 — shimmer
      { freq: 1760, gain: 0.04, start: 0.04, dur: 0.4 },   // A6 — sparkle
      { freq: 660, gain: 0.1, start: 0.15, dur: 0.8 },     // E5 — warm body
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
  } catch { /* silent */ }
}

export function IntroScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      playIntroChime();
      setFadeOut(true);
      setTimeout(() => setVisible(false), 800);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={`intro-screen ${fadeOut ? "fade-out" : ""}`}>
      <div className="intro-logo">
        <FlameKindling size={32} className="text-[#0B0E14]" />
      </div>
      <p className="intro-title">DisciplinaMax</p>
      <p className="intro-subtitle">Mentor de Disciplina</p>
      <div className="intro-loader">
        <div className="intro-loader-bar" />
      </div>
    </div>
  );
}
