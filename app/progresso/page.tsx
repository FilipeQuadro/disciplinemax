"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import {
  Flame, Star, Trophy, Target, BookOpen, Timer,
  TrendingUp, Lightbulb, Lock
} from "lucide-react";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/services/achievement-service";
import { CHALLENGES } from "@/lib/services/challenge-service";
import { LevelService } from "@/lib/services/level-service";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { SkeletonPage } from "@/components/Skeleton";
import { HeroHeader } from "@/components/ui/HeroHeader";
import { GradientCard } from "@/components/ui/GradientCard";

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
    return <div className="page-enter"><SkeletonPage /></div>;
  }

  if (error) {
    return (
      <div className="page-enter space-y-6">
        <HeroHeader title="Progresso" icon={Trophy} iconColor="var(--gold)" />
        <ErrorCard onRetry={loadAll} />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-8">
      <HeroHeader title="Progresso" icon={Trophy} iconColor="var(--gold)" />

      <div className="stagger-children space-y-4">
        {/* XP & Level Banner */}
        <GradientCard variant="gold">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)" }}>
              <Star size={24} style={{ color: "var(--gold)" }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold tracking-tight text-white">Nível {currentLevel}</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{totalXp.toLocaleString()} XP</p>
              </div>
              <div className="mt-2 progress-bar">
                <div className="progress-fill" style={{ width: `${levelProgress}%`, background: "linear-gradient(90deg, var(--gold-dark), var(--gold))" }} />
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>{xpToNext} XP para o próximo nível</p>
            </div>
          </div>
        </GradientCard>

        {/* Streak Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <Flame size={20} style={{ color: currentStreak > 0 ? "var(--warning)" : "var(--text-secondary)" }} />
            <p className="text-sm font-semibold tracking-tight text-white">Streak</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Atual" value={currentStreak} color="var(--accent-orange)" />
            <StatBox label="Recorde" value={streakData?.longest_streak ?? 0} color="var(--gold)" />
            <StatBox label="Semana" value={streakData?.weekly_streak ?? 0} color="var(--accent-teal)" />
          </div>
          {streakData && streakData.consistency_rate > 0 && (
            <p className="text-[11px] mt-3 text-center" style={{ color: "var(--text-secondary)" }}>
              Consistência: {Math.round(streakData.consistency_rate * 100)}% • Congelamentos: {streakData.streak_freeze_count}
            </p>
          )}
        </div>

        {/* Active Challenges */}
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <Target size={20} style={{ color: "var(--accent-teal)" }} />
            <p className="text-sm font-semibold tracking-tight text-white">Desafios da Semana</p>
          </div>
          {challenges.filter((c) => !c.completed).length === 0 ? (
            <EmptyState
              icon={Target}
              iconColor="var(--accent-teal)"
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
                  <div key={challenge.challenge_id} className="glass p-3 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-white">{def?.label ?? challenge.challenge_id}</p>
                      <p className="text-[10px]" style={{ color: "var(--gold)" }}>+{challenge.xp_reward} XP</p>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--accent-teal)" }} />
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>{Math.floor(challenge.progress)}/{challenge.target}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <Trophy size={20} style={{ color: "var(--gold)" }} />
            <p className="text-sm font-semibold tracking-tight text-white">Conquistas</p>
            <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>
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
                    <Lock size={12} style={{ color: "var(--text-secondary)" }} />
                  )}
                  <p className="text-[8px] mt-1 text-center" style={{ color: unlocked ? ach.color : "var(--text-secondary)" }}>
                    {unlocked ? ach.label : "???"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights */}
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <Lightbulb size={20} style={{ color: "var(--accent-purple)" }} />
            <p className="text-sm font-semibold tracking-tight text-white">Insights</p>
          </div>
          {insights.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              iconColor="var(--accent-purple)"
              title="Nenhum insight ainda"
              description="Continue estudando e completando metas para receber insights personalizados sobre seu progresso!"
              primaryAction={{ label: "Ir para o Dashboard", href: "/" }}
            />
          ) : (
            <div className="space-y-2">
              {insights.slice(0, 3).map((ins, i) => (
                <div key={i} className="p-3 rounded-xl flex items-start gap-2" style={{ background: "rgba(124,107,189,0.05)" }}>
                  <TrendingUp size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent-purple)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ins.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/livros" className="card-purple rounded-2xl p-3 text-center glow-border">
            <BookOpen size={18} className="mx-auto mb-1" style={{ color: "var(--accent-purple)" }} />
            <p className="text-[10px] font-medium" style={{ color: "var(--accent-purple)" }}>Registrar Leitura</p>
          </Link>
          <Link href="/pomodoro" className="card-red rounded-2xl p-3 text-center glow-border">
            <Timer size={18} className="mx-auto mb-1" style={{ color: "var(--danger)" }} />
            <p className="text-[10px] font-medium" style={{ color: "var(--danger)" }}>Iniciar Foco</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────
function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center p-2 rounded-xl" style={{ background: `${color}08` }}>
      <p className="text-lg font-semibold tracking-tight" style={{ color }}>{value}</p>
      <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{label}</p>
    </div>
  );
}
