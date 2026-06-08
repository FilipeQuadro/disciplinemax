"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Flame, BookOpen, Timer, BookMarked, Star, Trophy, ArrowLeft, Share2
} from "lucide-react";
import Link from "next/link";
import { LevelService } from "@/lib/services/level-service";
import { ACHIEVEMENTS } from "@/lib/services/achievement-service";
import { shareProfile } from "@/lib/share";
import { SkeletonProfile } from "@/components/Skeleton";
import { ErrorCard } from "@/components/ErrorCard";
import { HeroHeader } from "@/components/ui/HeroHeader";
import { StatCard } from "@/components/ui/StatCard";
import { GradientCard } from "@/components/ui/GradientCard";
import { Badge } from "@/components/ui/Badge";

interface PublicProfile {
  username: string;
  displayName: string | null;
  bio: string;
  booksCompleted: number;
  totalPages: number;
  pomodorosTotal: number;
  bibleChaptersTotal: number;
  xp: number;
  level: number;
  achievements: string[];
  currentStreak: number;
  longestStreak: number;
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/u/${username}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data?.profile) setProfile(data.profile);
      })
      .catch(() => setError("Não foi possível carregar o perfil."))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return <SkeletonProfile />;
  }

  if (error) {
    return <ErrorCard onRetry={() => window.location.reload()} />;
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Star size={48} className="mb-4" style={{ color: "var(--text-secondary)" }} />
        <h2 className="text-xl font-bold text-white mb-2">Perfil não encontrado</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Este perfil não existe ou não é público.</p>
        <Link href="/" className="btn-primary">Voltar ao Dashboard</Link>
      </div>
    );
  }

  const displayName = profile.displayName || profile.username;
  const xpProgress = LevelService.levelProgress(profile.xp);
  const xpToNext = LevelService.xpToNextLevel(profile.xp);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <HeroHeader
            title={`@${profile.username}`}
            subtitle={profile.bio || undefined}
            showDate={false}
          />
        </div>
        <button
          onClick={() => shareProfile(profile.username, displayName, profile.level, profile.currentStreak)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--gold)" }}
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Profile Card */}
      <GradientCard variant="gold">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))", color: "var(--bg-primary)" }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nível {profile.level}</p>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${xpProgress}%`, background: "linear-gradient(90deg, var(--gold-dark), var(--gold))" }} />
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{xpToNext} XP para o próximo nível · {profile.xp.toLocaleString()} XP total</p>
      </GradientCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <StatCard icon={Flame} label="Streak" value={profile.currentStreak} color="var(--accent-orange)" />
          <p className="text-[11px] mt-0.5 px-4" style={{ color: "var(--text-secondary)" }}>Recorde: {profile.longestStreak}d</p>
        </div>
        <div>
          <StatCard icon={BookOpen} label="Livros" value={profile.booksCompleted} color="var(--accent-purple)" />
          <p className="text-[11px] mt-0.5 px-4" style={{ color: "var(--text-secondary)" }}>{profile.totalPages} páginas</p>
        </div>
        <div>
          <StatCard icon={Timer} label="Pomodoros" value={profile.pomodorosTotal} color="var(--accent-red)" />
          <p className="text-[11px] mt-0.5 px-4" style={{ color: "var(--text-secondary)" }}>sessões</p>
        </div>
        <div>
          <StatCard icon={BookMarked} label="Bíblia" value={profile.bibleChaptersTotal} color="var(--gold)" />
          <p className="text-[11px] mt-0.5 px-4" style={{ color: "var(--text-secondary)" }}>capítulos</p>
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Trophy size={16} style={{ color: "var(--gold)" }} />
            Conquistas
          </h2>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{profile.achievements.length}/{ACHIEVEMENTS.length}</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = profile.achievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                title={unlocked ? `${ach.label}: ${ach.description}` : "???"}
                className="rounded-xl p-2 flex flex-col items-center justify-center gap-1 transition-all duration-300 cursor-default"
                style={{
                  background: unlocked ? `${ach.color}12` : "rgba(255,255,255,0.01)",
                  border: unlocked ? `1px solid ${ach.color}25` : "1px solid rgba(255,255,255,0.03)",
                  opacity: unlocked ? 1 : 0.3,
                }}
              >
                <Trophy size={14} style={{ color: unlocked ? ach.color : "var(--text-secondary)" }} />
                <Badge variant={unlocked ? "premium" : "default"} className="text-[8px] px-1 py-0 leading-normal">
                  {unlocked ? ach.label : "???"}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
