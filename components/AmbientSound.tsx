"use client";

import { useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, CloudRain, Flame, Music } from "lucide-react";

type AmbientType = "rain" | "fire" | "lofi" | null;

interface AmbientState {
  type: AmbientType;
  playing: boolean;
  volume: number;
}

export function useAmbientSound() {
  const [state, setState] = useState<AmbientState>({ type: null, playing: false, volume: 0.3 });
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ sources: any[]; gains: GainNode[] }>({ sources: [], gains: [] });

  const stop = useCallback(() => {
    for (const src of nodesRef.current.sources) {
      try { src.stop(); } catch {}
    }
    nodesRef.current = { sources: [], gains: [] };
    setState((s) => ({ ...s, playing: false }));
  }, []);

  const play = useCallback((type: AmbientType) => {
    stop();
    if (!type) return;

    const ctx = ctxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = state.volume * 0.15;
    masterGain.connect(ctx.destination);

    const sources: any[] = [];
    const gains: GainNode[] = [masterGain];

    if (type === "rain") {
      // White noise filtered for rain
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

      // Add drip sounds
      for (let i = 0; i < 3; i++) {
        const drip = ctx.createOscillator();
        drip.type = "sine";
        drip.frequency.value = 2000 + Math.random() * 3000;
        const dripGain = ctx.createGain();
        dripGain.gain.value = 0.02;
        drip.connect(dripGain);
        dripGain.connect(masterGain);
        // Randomize pitch with LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.3 + Math.random() * 0.7;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 500;
        lfo.connect(lfoGain);
        lfoGain.connect(drip.frequency);
        lfo.start();
        drip.start();
        sources.push(lfo);
      }
      sources.push(noise);
    } else if (type === "fire") {
      // Crackling fire — filtered noise + pops
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

      // Crackle — random amplitude modulation
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
      // Lo-fi beat — soft sine chord + subtle percussion
      const notes = [261.63, 329.63, 392.0]; // C4, E4, G4
      for (const freq of notes) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.08;

        // Subtle vibrato
        const vibrato = ctx.createOscillator();
        vibrato.frequency.value = 4;
        const vibratoGain = ctx.createGain();
        vibratoGain.gain.value = 2;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start();

        // Tremolo
        const tremolo = ctx.createOscillator();
        tremolo.frequency.value = 0.5;
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = 0.03;
        tremolo.connect(tremoloGain);
        tremoloGain.connect(oscGain.gain);
        tremolo.start();

        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        sources.push(osc, vibrato, tremolo);
      }
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

  return { ...state, play, stop, toggle, setVolume };
}

export function AmbientControls({ ambient }: { ambient: ReturnType<typeof useAmbientSound> }) {
  const sounds: { key: AmbientType; icon: typeof CloudRain; label: string }[] = [
    { key: "rain", icon: CloudRain, label: "Chuva" },
    { key: "fire", icon: Flame, label: "Lareira" },
    { key: "lofi", icon: Music, label: "Lo-fi" },
  ];

  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <p className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: "#555E6E" }}>
        Som ambiente
      </p>
      <div className="flex items-center gap-2">
        {sounds.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => ambient.toggle(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: ambient.type === key && ambient.playing ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)",
              border: ambient.type === key && ambient.playing ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.04)",
              color: ambient.type === key && ambient.playing ? "#D4AF37" : "#555E6E",
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
            className="w-16 h-1 accent-[#D4AF37] ml-1"
          />
        )}
        {ambient.playing && (
          <button onClick={ambient.stop} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555E6E" }}>
            <VolumeX size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
