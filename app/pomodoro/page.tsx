"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { Timer, Play, Pause, RotateCcw, SkipForward, Coffee, Zap, BarChart3 } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { clsx } from "clsx";

const COLORS = {
  focus: { primary: "#ef4444", bg: "from-red-500/15 to-rose-500/10", border: "border-red-500/20", ring: "#ef4444" },
  shortBreak: { primary: "#10b981", bg: "from-emerald-500/15 to-green-500/10", border: "border-emerald-500/20", ring: "#10b981" },
  longBreak: { primary: "#0ea5e9", bg: "from-sky-500/15 to-blue-500/10", border: "border-sky-500/20", ring: "#0ea5e9" },
};

export default function PomodoroPage() {
  const { pomodoroActive, pomodoroTimeLeft, pomodoroIsBreak, pomodoroCount,
    pomodoroTask, setPomodoroActive, setPomodoroTimeLeft, setPomodoroIsBreak,
    setPomodoroCount, setPomodoroTask, todaySessions, addSession, settings } = useStore();

  const [mode, setMode] = useState<"focus" | "shortBreak" | "longBreak">("focus");
  const [customFocus, setCustomFocus] = useState(settings?.pomodoro_duration || 25);
  const [customShort, setCustomShort] = useState(settings?.short_break || 5);
  const [customLong, setCustomLong] = useState(settings?.long_break || 15);
  const [pomosUntilLong] = useState(settings?.pomodoros_until_long || 4);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const audioRef = useRef<AudioContext | null>(null);

  const getModeTime = useCallback(() => {
    if (mode === "focus") return customFocus * 60;
    if (mode === "shortBreak") return customShort * 60;
    return customLong * 60;
  }, [mode, customFocus, customShort, customLong]);

  // Reset quando muda modo
  useEffect(() => {
    if (!pomodoroActive) {
      setPomodoroTimeLeft(getModeTime());
    }
  }, [mode, getModeTime]);

  // Timer principal
  useEffect(() => {
    if (pomodoroActive) {
      intervalRef.current = setInterval(() => {
        setPomodoroTimeLeft((prev: number) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [pomodoroActive]);

  async function handleTimerEnd() {
    setPomodoroActive(false);
    playNotificationSound();

    if (mode === "focus") {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);

      // Salvar sessão
      const session = {
        id: crypto.randomUUID(),
        user_id: "user",
        duration_minutes: customFocus,
        break_minutes: 0,
        completed: true,
        task_name: pomodoroTask,
        started_at: (startTime || new Date()).toISOString(),
        ended_at: new Date().toISOString(),
      };
      addSession(session);
      await (supabase.from("pomodoro_sessions") as any).insert(session);

      toast.success(`🍅 Pomodoro #${newCount} concluído! Descanse.`, { duration: 5000 });

      // Auto mudar para pausa
      if (newCount % pomosUntilLong === 0) {
        setMode("longBreak");
        setPomodoroTimeLeft(customLong * 60);
        toast(`☕ Hora da pausa longa (${customLong} min)!`, { icon: "🎉", duration: 4000 });
      } else {
        setMode("shortBreak");
        setPomodoroTimeLeft(customShort * 60);
        toast(`☕ Pausa curta de ${customShort} min!`, { duration: 3000 });
      }
      setPomodoroIsBreak(true);
    } else {
      // Fim da pausa → volta para foco
      toast("🎯 Pausa terminada! Hora de focar!", { duration: 3000 });
      setMode("focus");
      setPomodoroTimeLeft(customFocus * 60);
      setPomodoroIsBreak(false);
    }
  }

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    } catch (e) { /* silent */ }
  }

  function toggleTimer() {
    if (!pomodoroActive) {
      if (!startTime) setStartTime(new Date());
      setPomodoroActive(true);
    } else {
      setPomodoroActive(false);
    }
  }

  function resetTimer() {
    setPomodoroActive(false);
    setPomodoroTimeLeft(getModeTime());
    setStartTime(null);
  }

  function skipToBreak() {
    setPomodoroActive(false);
    setMode("shortBreak");
    setPomodoroTimeLeft(customShort * 60);
  }

  const totalSeconds = getModeTime();
  const progress = ((totalSeconds - pomodoroTimeLeft) / totalSeconds) * 100;
  const minutes = Math.floor(pomodoroTimeLeft / 60);
  const seconds = pomodoroTimeLeft % 60;
  const colors = COLORS[mode];

  // SVG ring
  const size = 240;
  const strokeWidth = 8;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const totalFocusToday = todaySessions.filter((s) => s.completed).length;
  const totalMinutesToday = todaySessions.filter((s) => s.completed).reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Timer size={24} className="text-red-400" /> Pomodoro
          </h1>
          <p className="text-slate-400 text-sm mt-1">Técnica de foco profundo</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="btn-ghost text-sm">
          ⚙️ Tempos
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold text-white mb-4">Personalizar Tempos</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Foco (min)</label>
              <input type="number" className="input" value={customFocus}
                onChange={(e) => setCustomFocus(+e.target.value)} min={1} max={120} />
            </div>
            <div>
              <label className="label">Pausa curta</label>
              <input type="number" className="input" value={customShort}
                onChange={(e) => setCustomShort(+e.target.value)} min={1} max={30} />
            </div>
            <div>
              <label className="label">Pausa longa</label>
              <input type="number" className="input" value={customLong}
                onChange={(e) => setCustomLong(+e.target.value)} min={1} max={60} />
            </div>
          </div>
        </div>
      )}

      {/* Modo selector */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
        {(["focus", "shortBreak", "longBreak"] as const).map((m) => (
          <button key={m} onClick={() => { if (!pomodoroActive) setMode(m); }}
            disabled={pomodoroActive}
            className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              mode === m ? "bg-white/15 text-white shadow-lg" : "text-slate-500 hover:text-slate-300 disabled:cursor-not-allowed")}>
            {m === "focus" ? "🎯 Foco" : m === "shortBreak" ? "☕ Pausa" : "🎉 Longa"}
          </button>
        ))}
      </div>

      {/* Timer circular */}
      <div className={clsx("card bg-gradient-to-br flex flex-col items-center py-8", colors.bg, "border", colors.border)}>
        {/* Task input */}
        <input
          className="input text-center mb-6 max-w-xs text-sm"
          placeholder="Em que está trabalhando? (opcional)"
          value={pomodoroTask}
          onChange={(e) => setPomodoroTask(e.target.value)}
          disabled={pomodoroActive}
        />

        {/* SVG Ring */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="timer-ring absolute top-0 left-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={colors.ring} strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 8px ${colors.ring}80)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl font-bold text-white font-mono tracking-tight">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            <p className="text-slate-400 text-sm mt-2 capitalize">
              {mode === "focus" ? "🎯 Foco" : mode === "shortBreak" ? "☕ Pausa curta" : "🎉 Pausa longa"}
            </p>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: pomosUntilLong }).map((_, i) => (
                <div key={i} className={clsx("w-2 h-2 rounded-full transition-colors",
                  i < (pomodoroCount % pomosUntilLong) ? "bg-red-400" : "bg-white/20")} />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-6">
          <button onClick={resetTimer} className="w-12 h-12 rounded-xl glass flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <RotateCcw size={18} />
          </button>
          <button onClick={toggleTimer}
            className={clsx("w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold transition-all duration-200 active:scale-95 shadow-2xl",
              pomodoroActive ? "bg-slate-600 hover:bg-slate-500" : `shadow-lg`)}
            style={!pomodoroActive ? { background: colors.ring, boxShadow: `0 8px 32px ${colors.ring}60` } : {}}>
            {pomodoroActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
          <button onClick={skipToBreak} className="w-12 h-12 rounded-xl glass flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <SkipForward size={18} />
          </button>
        </div>
      </div>

      {/* Stats hoje */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-400">{totalFocusToday}</p>
          <p className="text-xs text-slate-500 mt-1">Pomodoros hoje</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-sky-400">{totalMinutesToday}</p>
          <p className="text-xs text-slate-500 mt-1">Minutos focados</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-violet-400">{pomodoroCount}</p>
          <p className="text-xs text-slate-500 mt-1">Total acumulado</p>
        </div>
      </div>

      {/* Histórico de sessões hoje */}
      {todaySessions.length > 0 && (
        <div>
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 size={16} className="text-red-400" /> Sessões de Hoje
          </h3>
          <div className="space-y-2">
            {todaySessions.slice(-8).reverse().map((s, i) => (
              <div key={s.id} className="glass-hover rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center text-xs font-bold text-red-400">
                    🍅
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{s.task_name || "Sessão de foco"}</p>
                    <p className="text-xs text-slate-500">{format(new Date(s.started_at), "HH:mm")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{s.duration_minutes} min</p>
                  <span className="badge bg-emerald-500/20 text-emerald-400 text-xs">✓ Concluído</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
