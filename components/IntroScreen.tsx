"use client";

import { useEffect, useState } from "react";
import { FlameKindling } from "lucide-react";

/**
 * Heavy gate/portcullis opening sound — deep metallic groan with chain rattle.
 * Plays when the intro screen first appears (entering the "fortress").
 */
function playGateSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Low metallic groan — sawtooth through lowpass filter
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

    // Chain rattle — rapid noise bursts through bandpass
    const rattleLen = 0.6;
    const rattleBuf = ctx.createBuffer(1, ctx.sampleRate * rattleLen, ctx.sampleRate);
    const rattleData = rattleBuf.getChannelData(0);
    for (let i = 0; i < rattleData.length; i++) {
      // Sparse crackle: mostly silence with random bursts
      rattleData[i] = Math.random() < 0.15 ? (Math.random() * 2 - 1) * 0.6 : 0;
    }
    const rattleSrc = ctx.createBufferSource();
    rattleSrc.buffer = rattleBuf;
    const rattleFilter = ctx.createBiquadFilter();
    rattleFilter.type = "bandpass";
    rattleFilter.frequency.setValueAtTime(800, now);
    rattleFilter.Q.setValueAtTime(2, now);
    const rattleGain = ctx.createGain();
    rattleGain.gain.setValueAtTime(0, now);
    rattleGain.gain.linearRampToValueAtTime(0.12, now + 0.05);
    rattleGain.gain.exponentialRampToValueAtTime(0.001, now + rattleLen);
    rattleSrc.connect(rattleFilter);
    rattleFilter.connect(rattleGain);
    rattleGain.connect(ctx.destination);
    rattleSrc.start(now + 0.1);
    rattleSrc.stop(now + 0.1 + rattleLen);

    // Deep thud — sine burst for the gate latch releasing
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(45, now + 0.08);
    thudGain.gain.setValueAtTime(0, now);
    thudGain.gain.setValueAtTime(0.15, now + 0.08);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now + 0.08);
    thud.stop(now + 0.6);

    // High metallic creak — filtered square wave slide
    const creak = ctx.createOscillator();
    const creakGain = ctx.createGain();
    const creakFilter = ctx.createBiquadFilter();
    creak.type = "square";
    creak.frequency.setValueAtTime(300, now + 0.3);
    creak.frequency.linearRampToValueAtTime(120, now + 1.0);
    creakFilter.type = "bandpass";
    creakFilter.frequency.setValueAtTime(600, now + 0.3);
    creakFilter.Q.setValueAtTime(8, now + 0.3);
    creakGain.gain.setValueAtTime(0, now);
    creakGain.gain.setValueAtTime(0.03, now + 0.3);
    creakGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    creak.connect(creakFilter);
    creakFilter.connect(creakGain);
    creakGain.connect(ctx.destination);
    creak.start(now + 0.3);
    creak.stop(now + 1.1);
  } catch { /* silent */ }
}

/**
 * Bell-like chime — bright, welcoming. Plays when the intro fades out (entering the app).
 */
function playIntroChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

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

export { playGateSound, playIntroChime };

export function IntroScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Gate sound on entry
    playGateSound();

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
