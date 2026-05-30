"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { Timer, Play, Pause, RotateCcw, SkipForward, BarChart3 } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { clsx } from "clsx";
import { AmbientControls, useAmbientSound } from "@/components/AmbientSound";
import { useAuth } from "@/components/AuthProvider";
import { trackPomodoroCompleted } from "@/lib/stats";

const COLORS = {
  focus: { primary: "#D94F4F", bg: "linear-gradient(145deg, rgba(217,79,79,0.06) 0%, rgba(20,24,32,0.9) 100%)", border: "rgba(217,79,79,0.12)", ring: "#D94F4F" },
  shortBreak: { primary: "#3ABAB4", bg: "linear-gradient(145deg, rgba(58,186,180,0.06) 0%, rgba(20,24,32,0.9) 100%)", border: "rgba(58,186,180,0.12)", ring: "#3ABAB4" },
  longBreak: { primary: "#7C6BBD", bg: "linear-gradient(145deg, rgba(124,107,189,0.06) 0%, rgba(20,24,32,0.9) 100%)", border: "rgba(124,107,189,0.12)", ring: "#7C6BBD" },
};

export default function PomodoroPage() {
  const { pomodoroActive, pomodoroTimeLeft, pomodoroIsBreak, pomodoroCount,
    pomodoroTask, setPomodoroActive, setPomodoroTimeLeft, setPomodoroIsBreak,
    setPomodoroCount, setPomodoroTask, todaySessions, addSession, settings } = useStore();
  const { user } = useAuth();

  const [mode, setMode] = useState<"focus" | "shortBreak" | "longBreak">("focus");
  const [customFocus, setCustomFocus] = useState(25);
  const [customShort, setCustomShort] = useState(5);
  const [customLong, setCustomLong] = useState(15);
  const [pomosUntilLong, setPomosUntilLong] = useState(4);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const ambient = useAmbientSound();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Sync custom values when settings load
  useEffect(() => {
    if (settings) {
      setCustomFocus(settings.pomodoro_duration || 25);
      setCustomShort(settings.short_break || 5);
      setCustomLong(settings.long_break || 15);
      setPomosUntilLong(settings.pomodoros_until_long || 4);
    }
  }, [settings]);

  const getModeTime = useCallback(() => {
    if (mode === "focus") return customFocus * 60;
    if (mode === "shortBreak") return customShort * 60;
    return customLong * 60;
  }, [mode, customFocus, customShort, customLong]);

  useEffect(() => { if (!pomodoroActive) setPomodoroTimeLeft(getModeTime()); }, [mode, getModeTime]);

  useEffect(() => {
    if (pomodoroActive) {
      intervalRef.current = setInterval(() => {
        setPomodoroTimeLeft((prev: number) => prev <= 1 ? 0 : prev - 1);
      }, 1000);
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [pomodoroActive]);

  const [timerEnded, setTimerEnded] = useState(false);
  useEffect(() => {
    if (pomodoroTimeLeft === 0 && pomodoroActive && !timerEnded) {
      setTimerEnded(true);
      handleTimerEnd();
    }
    if (pomodoroTimeLeft > 0) setTimerEnded(false);
  }, [pomodoroTimeLeft]);

  async function handleTimerEnd() {
    setPomodoroActive(false);
    playNotificationSound();

    if (mode === "focus") {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      if (!user?.id) return;
      const session = {
        id: crypto.randomUUID(), user_id: user.id, duration_minutes: customFocus,
        break_minutes: 0, completed: true, task_name: pomodoroTask,
        started_at: (startTime || new Date()).toISOString(), ended_at: new Date().toISOString(),
      };
      addSession(session);
      try {
        await dataFetch({ action: "insert", table: "pomodoro_sessions", payload: session });
        trackPomodoroCompleted(user.id, customFocus).catch(() => {});
      } catch {
        toast.error("Erro ao salvar sessão — o pomodoro pode não ter sido registrado");
      }
      toast.success(`🍅 Pomodoro #${newCount} concluído!`, { duration: 5000 });

      if (newCount % pomosUntilLong === 0) {
        setMode("longBreak"); setPomodoroTimeLeft(customLong * 60);
        toast(`☕ Pausa longa (${customLong} min)!`, { icon: "🎉", duration: 4000 });
      } else {
        setMode("shortBreak"); setPomodoroTimeLeft(customShort * 60);
        toast(`☕ Pausa curta de ${customShort} min!`, { duration: 3000 });
      }
      setPomodoroIsBreak(true);
    } else {
      toast("🎯 Hora de focar!", { duration: 3000 });
      setMode("focus"); setPomodoroTimeLeft(customFocus * 60); setPomodoroIsBreak(false);
    }
  }

  // Reuse AudioContext to avoid iOS exhaustion (~6 max)
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playNotificationSound() {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") { ctx.resume().catch(() => {}); }
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    } catch { /* silent — audio is optional */ }
  }

  function toggleTimer() {
    if (!pomodoroActive) { if (!startTime) setStartTime(new Date()); setPomodoroActive(true); }
    else { setPomodoroActive(false); }
  }

  function resetTimer() { setPomodoroActive(false); setPomodoroTimeLeft(getModeTime()); setStartTime(null); }
  function skipToBreak() {
    setPomodoroActive(false);
    setPomodoroIsBreak(true);
    setMode("shortBreak");
    setPomodoroTimeLeft(customShort * 60);
  }

  const totalSeconds = getModeTime();
  const progress = ((totalSeconds - pomodoroTimeLeft) / totalSeconds) * 100;
  const minutes = Math.floor(pomodoroTimeLeft / 60);
  const seconds = pomodoroTimeLeft % 60;
  const colors = COLORS[mode];

  const size = 260; const strokeWidth = 5; const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const totalFocusToday = todaySessions.filter((s) => s.completed).length;
  const totalMinutesToday = todaySessions.filter((s) => s.completed).reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <Timer size={24} style={{ color: "#D94F4F" }} /> Pomodoro
          </h1>
          <p className="text-sm mt-1" style={{ color: "#555E6E" }}>Técnica de foco profundo</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="btn-ghost text-sm">⚙️ Tempos</button>
      </div>

      {showSettings && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold text-white mb-4">Personalizar Tempos</h3>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Foco (min)</label><input type="number" className="input" value={customFocus} onChange={(e) => setCustomFocus(+e.target.value)} min={1} max={120} /></div>
            <div><label className="label">Pausa curta</label><input type="number" className="input" value={customShort} onChange={(e) => setCustomShort(+e.target.value)} min={1} max={30} /></div>
            <div><label className="label">Pausa longa</label><input type="number" className="input" value={customLong} onChange={(e) => setCustomLong(+e.target.value)} min={1} max={60} /></div>
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        {(["focus", "shortBreak", "longBreak"] as const).map((m) => (
          <button key={m} onClick={() => { if (!pomodoroActive) setMode(m); }} disabled={pomodoroActive}
            className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300")}
            style={{
              background: mode === m ? "rgba(255,255,255,0.06)" : "transparent",
              color: mode === m ? "#F0F0F0" : "#555E6E",
              cursor: pomodoroActive ? "not-allowed" : "pointer",
            }}>
            {m === "focus" ? "🎯 Foco" : m === "shortBreak" ? "☕ Pausa" : "🎉 Longa"}
          </button>
        ))}
      </div>

      {/* Ambient Sound */}
      <AmbientControls ambient={ambient} />

      {/* Timer */}
      <div className="rounded-2xl flex flex-col items-center py-8"
        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
        <input className="input text-center mb-6 max-w-xs text-sm" placeholder="Em que está trabalhando?"
          value={pomodoroTask} onChange={(e) => setPomodoroTask(e.target.value)} disabled={pomodoroActive} />

        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="timer-ring absolute top-0 left-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={strokeWidth} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.ring} strokeWidth={strokeWidth}
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 12px ${colors.ring}50)` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl font-bold text-white font-mono tracking-tight">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            <p className="text-sm mt-2" style={{ color: "#555E6E" }}>
              {mode === "focus" ? "Foco" : mode === "shortBreak" ? "Pausa curta" : "Pausa longa"}
            </p>
            <div className="flex gap-1.5 mt-3">
              {Array.from({ length: pomosUntilLong }).map((_, i) => (
                <div key={i} className={clsx("w-2 h-2 rounded-full transition-all duration-300")}
                  style={{
                    background: i < (pomodoroCount % pomosUntilLong) ? colors.ring : "rgba(255,255,255,0.08)",
                    boxShadow: i < (pomodoroCount % pomosUntilLong) ? `0 0 6px ${colors.ring}50` : "none",
                  }} />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-6">
          <button onClick={resetTimer} className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: "#555E6E" }}>
            <RotateCcw size={18} />
          </button>
          <button onClick={toggleTimer}
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold transition-all duration-300 active:scale-95"
            style={!pomodoroActive ? {
              background: colors.ring,
              boxShadow: `0 8px 40px ${colors.ring}30`,
            } : { background: "rgba(255,255,255,0.06)" }}>
            {pomodoroActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
          <button onClick={skipToBreak} className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: "#555E6E" }}>
            <SkipForward size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: totalFocusToday, label: "Pomodoros hoje", color: "#D94F4F" },
          { value: totalMinutesToday, label: "Minutos focados", color: "#3ABAB4" },
          { value: pomodoroCount, label: "Total acumulado", color: "#7C6BBD" },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl p-4 text-center glow-border"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-3xl font-bold count-up" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[10px] mt-1" style={{ color: "#555E6E" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Sessions */}
      {todaySessions.length > 0 && (
        <div>
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 size={16} style={{ color: "#D94F4F" }} /> Sessões de Hoje
          </h3>
          <div className="space-y-2">
            {todaySessions.slice(-8).reverse().map((s) => (
              <div key={s.id} className="glass-hover rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: "rgba(217,79,79,0.08)" }}>🍅</div>
                  <div>
                    <p className="text-sm font-medium text-white">{s.task_name || "Sessão de foco"}</p>
                    <p className="text-[10px]" style={{ color: "#555E6E" }}>{format(new Date(s.started_at), "HH:mm")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{s.duration_minutes} min</p>
                  <span className="badge text-[10px]" style={{ background: "rgba(58,186,180,0.1)", color: "#3ABAB4" }}>✓</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
