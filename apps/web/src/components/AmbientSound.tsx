"use client";

import { useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, CloudRain, Flame, Music } from "lucide-react";

type AmbientType = "rain" | "fire" | "lofi" | null;

interface AmbientState {
  type: AmbientType;
  playing: boolean;
  volume: number;
}

// Global flag to track if user has interacted (required for iOS AudioContext)
let audioUnlocked = false;

if (typeof window !== "undefined") {
  const unlockAudio = () => {
    audioUnlocked = true;
    // Try to create and resume an AudioContext to unlock it
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        if (ctx.state === "suspended") ctx.resume();
        ctx.close().catch(() => {});
      }
    } catch { /* silent */ }
    document.removeEventListener("click", unlockAudio);
    document.removeEventListener("touchend", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
  };
  document.addEventListener("click", unlockAudio, { once: true });
  document.addEventListener("touchend", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
}

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

export function useAmbientSound() {
  const [state, setState] = useState<AmbientState>({ type: null, playing: false, volume: 0.3 });
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ sources: any[]; gains: GainNode[] }>({ sources: [], gains: [] });

  const stop = useCallback(() => {
    for (const src of nodesRef.current.sources) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    // Disconnect all gain nodes from destination to prevent audio graph accumulation
    for (const gain of nodesRef.current.gains) {
      try { gain.disconnect(); } catch { /* already disconnected */ }
    }
    nodesRef.current = { sources: [], gains: [] };
    setState((s) => ({ ...s, playing: false }));
  }, []);

  const play = useCallback((type: AmbientType) => {
    if (!type) return;
    // Don't try to play if audio isn't unlocked (iOS)
    if (!audioUnlocked) {
      setState({ type, playing: false, volume: state.volume });
      return;
    }

    stop();

    // Close old AudioContext to avoid iOS exhaustion (~6 max)
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      try { ctxRef.current.close(); } catch { /* silent */ }
    }

    const ctx = createSafeAudioContext();
    if (!ctx) return;
    ctxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = state.volume * 0.15;
    masterGain.connect(ctx.destination);

    const sources: any[] = [];
    const gains: GainNode[] = [masterGain];

    try {
      if (type === "rain") {
        const bufferSize = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;
        filter.Q.value = 1;

        const gain = ctx.createGain();
        gain.gain.value = 0.6;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start();
        sources.push(noise);
      } else if (type === "fire") {
        const bufferSize = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 400;
        filter.Q.value = 0.5;

        const gain = ctx.createGain();
        gain.gain.value = 0.4;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start();

        const crackle = ctx.createOscillator();
        crackle.type = "sawtooth";
        crackle.frequency.value = 3;
        const crackleGain = ctx.createGain();
        crackleGain.gain.value = 200;
        crackle.connect(crackleGain);
        crackleGain.connect(filter.frequency);
        crackle.start();

        sources.push(noise, crackle);
      } else if (type === "lofi") {
        const notes = [261.63, 329.63, 392.0];
        for (const freq of notes) {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          const oscGain = ctx.createGain();
          oscGain.gain.value = 0.08;
          osc.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start();
          sources.push(osc);
        }
      }
    } catch {
      // If sound creation fails, silently fail
      for (const src of sources) {
        try { src.stop(); } catch { /* silent */ }
      }
      return;
    }

    nodesRef.current = { sources, gains };
    setState({ type, playing: true, volume: state.volume });
  }, [state.volume, stop]);

  const setVolume = useCallback((v: number) => {
    setState((s) => ({ ...s, volume: v }));
    if (nodesRef.current.gains[0]) {
      nodesRef.current.gains[0].gain.value = v * 0.15;
    }
  }, []);

  const toggle = useCallback((type: AmbientType) => {
    if (state.type === type && state.playing) {
      stop();
    } else {
      play(type);
    }
  }, [state.type, state.playing, play, stop]);

  return { ...state, play, stop, toggle, setVolume, audioUnlocked };
}

export function AmbientControls({ ambient }: { ambient: ReturnType<typeof useAmbientSound> }) {
  const sounds: { key: AmbientType; icon: typeof CloudRain; label: string }[] = [
    { key: "rain", icon: CloudRain, label: "Chuva" },
    { key: "fire", icon: Flame, label: "Lareira" },
    { key: "lofi", icon: Music, label: "Lo-fi" },
  ];

  return (
    <div className="glass rounded-xl p-3">
      <p className="text-[11px] uppercase tracking-wider font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
        Som ambiente {!ambient.audioUnlocked && <span style={{ color: "var(--warning)" }}>(toque p/ ativar)</span>}
      </p>
      <div className="flex items-center gap-2">
        {sounds.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => ambient.toggle(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-h-[44px]"
            style={{
              background: ambient.type === key && ambient.playing ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)",
              border: ambient.type === key && ambient.playing ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.04)",
              color: ambient.type === key && ambient.playing ? "var(--gold)" : "var(--text-secondary)",
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
        {ambient.playing && (
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={ambient.volume}
            onChange={(e) => ambient.setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 accent-[var(--gold)] ml-1"
          />
        )}
        {ambient.playing && (
          <button onClick={ambient.stop} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: "var(--text-secondary)" }} aria-label="Parar som ambiente">
            <VolumeX size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
