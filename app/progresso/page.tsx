"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import {
  Flame, Star, Trophy, Target, BookOpen, Timer, BookMarked,
  TrendingUp, Lightbulb, Lock
} from "lucide-react";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/services/achievement-service";
import { CHALLENGES } from "@/lib/services/challenge-service";
import { LevelService } from "@/lib/services/level-service";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";

// ── Types ─────────────────────────────────────────────────────
interface StreakData {
  current_streak: number;
  longest_streak: number;
  weekly_streak: number;
  monthly_streak: number;
  consistency_rate: number;
  streak_freeze_count: number;
}

interface XpData {
  total_xp: number;
  current_level: number;
}

interface AchievementData {
  achievement_id: string;
  progress: number;
  completed: boolean;
  unlocked_at: string | null;
}

interface ChallengeData {
  challenge_id: string;
  progress: number;
  target: number;
  completed: boolean;
  xp_reward: number;
  week_key: string;
}

interface InsightData {
  insight_type: string;
  message: string;
  created_at: string;
}

// ── Main Component ─────────────────────────────────────────────
export default function ProgressoPage() {
  const { user } = useAuth();
  const streak = useStore((s) => s.streak);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [xpData, setXpData] = useState<XpData | null>(null);
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(false);
    try {
      const [streakRes, xpRes, achRes, chalRes, insRes] = await Promise.all([
        dataFetch({ action: "select", table: "user_streaks", filters: { eq: { user_id: user!.id }, maybeSingle: true } }),
        dataFetch({ action: "select", table: "user_xp", filters: { eq: { user_id: user!.id }, maybeSingle: true } }),
        dataFetch({ action: "select", table: "user_achievements", filters: { eq: { user_id: user!.id } } }),
        dataFetch({ action: "select", table: "user_challenges", filters: { eq: { user_id: user!.id }, select: "challenge_id,progress,target,completed,xp_reward,week_key" } }),
        dataFetch({ action: "select", table: "user_insights", filters: { eq: { user_id: user!.id }, order: { column: "created_at", ascending: false }, limit: 5 } }),
      ]);

      if (streakRes.data) setStreakData(streakRes.data as StreakData);
      if (xpRes.data) setXpData(xpRes.data as XpData);
      if (achRes.data) setAchievements(achRes.data as AchievementData[]);
      if (chalRes.data) setChallenges(chalRes.data as ChallengeData[]);
      if (insRes.data) setInsights(insRes.data as InsightData[]);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadAll();
  }, [loadAll, user]);

  const totalXp = xpData?.total_xp ?? 0;
  const currentLevel = xpData?.current_level ?? 1;
  const xpToNext = LevelService.xpToNextLevel(totalXp);
  const levelProgress = LevelService.levelProgress(totalXp);
  const currentStreak = streakData?.current_streak ?? streak;

  if (loading) {
    return (
      <div className="min-h-screen p-4 pb-24 max-w-lg mx-auto" style={{ background: "#0B0E14" }}>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-32 rounded bg-white/[0.04]" />
          <div className="h-40 rounded-2xl bg-white/[0.02]" />
          <div className="h-28 rounded-2xl bg-white/[0.02]" />
          <div className="h-28 rounded-2xl bg-white/[0.02]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 pb-24 max-w-lg mx-auto" style={{ background: "#0B0E14" }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-serif font-bold text-white">Progresso</h1>
          <Link href="/" className="text-xs" style={{ color: "#D4AF37" }}>← Voltar</Link>
        </div>
        <ErrorCard onRetry={loadAll} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24 max-w-lg mx-auto" style={{ background: "#0B0E14" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif font-bold text-white">Progresso</h1>
        <Link href="/" className="text-xs" style={{ color: "#D4AF37" }}>← Voltar</Link>
      </div>

      {/* XP & Level Banner */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(168,137,43,0.05))", border: "1px solid rgba(212,175,55,0.15)" }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)" }}>
            <Star size={24} style={{ color: "#D4AF37" }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Nível {currentLevel}</p>
              <p className="text-[10px]" style={{ color: "#8B95A5" }}>{totalXp.toLocaleString()} XP</p>
            </div>
            <div className="mt-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${levelProgress}%`, background: "linear-gradient(90deg, #A8892B, #D4AF37)" }} />
            </div>
            <p className="text-[10px] mt-1" style={{ color: "#6B7585" }}>{xpToNext} XP para o próximo nível</p>
          </div>
        </div>
      </div>

      {/* Streak Card */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Flame size={20} style={{ color: currentStreak > 0 ? "#E8844A" : "#6B7585" }} />
          <p className="text-sm font-bold text-white">Streak</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Atual" value={currentStreak} color="#E8844A" />
          <StatBox label="Recorde" value={streakData?.longest_streak ?? 0} color="#D4AF37" />
          <StatBox label="Semana" value={streakData?.weekly_streak ?? 0} color="#3ABAB4" />
        </div>
        {streakData && streakData.consistency_rate > 0 && (
          <p className="text-[10px] mt-3 text-center" style={{ color: "#6B7585" }}>
            Consistência: {Math.round(streakData.consistency_rate * 100)}% • Congelamentos: {streakData.streak_freeze_count}
          </p>
        )}
      </div>

      {/* Active Challenges */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Target size={20} style={{ color: "#3ABAB4" }} />
          <p className="text-sm font-bold text-white">Desafios da Semana</p>
        </div>
        {challenges.filter((c) => !c.completed).length === 0 ? (
          <EmptyState
            icon={Target}
            iconColor="#3ABAB4"
            title="Nenhum desafio ativo"
            description="Complete suas metas diárias para gerar novos desafios e ganhar XP bônus!"
            primaryAction={{ label: "Registrar leitura", href: "/livros" }}
          />
        ) : (
          <div className="space-y-2">
            {challenges.filter((c) => !c.completed).map((challenge) => {
              const def = CHALLENGES.find((d) => d.id === challenge.challenge_id);
              const pct = Math.min((challenge.progress / challenge.target) * 100, 100);
              return (
                <div key={challenge.challenge_id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-white">{def?.label ?? challenge.challenge_id}</p>
                    <p className="text-[10px]" style={{ color: "#D4AF37" }}>+{challenge.xp_reward} XP</p>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#3ABAB4" }} />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: "#6B7585" }}>{Math.floor(challenge.progress)}/{challenge.target}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Trophy size={20} style={{ color: "#D4AF37" }} />
          <p className="text-sm font-bold text-white">Conquistas</p>
          <span className="text-[10px] ml-auto" style={{ color: "#8B95A5" }}>
            {achievements.filter((a) => a.completed).length}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
          {ACHIEVEMENTS.map((ach) => {
            const userAch = achievements.find((a) => a.achievement_id === ach.id);
            const unlocked = userAch?.completed ?? false;
            const progress = userAch?.progress ?? 0;
            return (
              <div
                key={ach.id}
                title={unlocked ? `${ach.label}: ${ach.description}` : progress > 0 ? `${ach.label} (${Math.round(progress)}%)` : "???"}
                className="rounded-xl p-2 flex flex-col items-center justify-center"
                style={{
                  background: unlocked ? `${ach.color}12` : "rgba(255,255,255,0.01)",
                  border: unlocked ? `1px solid ${ach.color}25` : "1px solid rgba(255,255,255,0.03)",
                  opacity: unlocked ? 1 : progress > 0 ? 0.6 : 0.3,
                }}
              >
                {unlocked ? (
                  <Trophy size={16} style={{ color: ach.color }} />
                ) : (
                  <Lock size={12} style={{ color: "#6B7585" }} />
                )}
                <p className="text-[8px] mt-1 text-center" style={{ color: unlocked ? ach.color : "#6B7585" }}>
                  {unlocked ? ach.label : "???"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights — always show section */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Lightbulb size={20} style={{ color: "#7C6BBD" }} />
          <p className="text-sm font-bold text-white">Insights</p>
        </div>
        {insights.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            iconColor="#7C6BBD"
            title="Nenhum insight ainda"
            description="Continue estudando e completando metas para receber insights personalizados sobre seu progresso!"
            primaryAction={{ label: "Ir para o Dashboard", href: "/" }}
          />
        ) : (
          <div className="space-y-2">
            {insights.slice(0, 3).map((ins, i) => (
              <div key={i} className="p-3 rounded-xl flex items-start gap-2" style={{ background: "rgba(124,107,189,0.05)" }}>
                <TrendingUp size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#7C6BBD" }} />
                <p className="text-xs" style={{ color: "#8B95A5" }}>{ins.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <Link href="/livros" className="p-3 rounded-xl text-center" style={{ background: "rgba(124,107,189,0.06)", border: "1px solid rgba(124,107,189,0.12)" }}>
          <BookOpen size={18} className="mx-auto mb-1" style={{ color: "#7C6BBD" }} />
          <p className="text-[10px] font-medium" style={{ color: "#7C6BBD" }}>Registrar Leitura</p>
        </Link>
        <Link href="/pomodoro" className="p-3 rounded-xl text-center" style={{ background: "rgba(217,79,79,0.06)", border: "1px solid rgba(217,79,79,0.12)" }}>
          <Timer size={18} className="mx-auto mb-1" style={{ color: "#D94F4F" }} />
          <p className="text-[10px] font-medium" style={{ color: "#D94F4F" }}>Iniciar Foco</p>
        </Link>
      </div>
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────
function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center p-2 rounded-xl" style={{ background: `${color}08` }}>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-[9px]" style={{ color: "#6B7585" }}>{label}</p>
    </div>
  );
}