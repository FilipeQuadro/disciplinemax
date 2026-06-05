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
        <Star size={48} className="mb-4" style={{ color: "#6B7585" }} />
        <h2 className="text-xl font-bold text-white mb-2">Perfil não encontrado</h2>
        <p className="text-sm mb-6" style={{ color: "#6B7585" }}>Este perfil não existe ou não é público.</p>
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
        <Link href="/" className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#8B95A5" }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-white">@{profile.username}</h1>
          {profile.bio && <p className="text-sm mt-1" style={{ color: "#8B95A5" }}>{profile.bio}</p>}
        </div>
        <button
          onClick={() => shareProfile(profile.username, displayName, profile.level, profile.currentStreak)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "#D4AF37" }}
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(20,24,32,0.9))", border: "1px solid rgba(212,175,55,0.12)" }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{ background: "linear-gradient(135deg, #D4AF37, #F5D060)", color: "#0B0E14" }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            <p className="text-sm" style={{ color: "#8B95A5" }}>Nível {profile.level}</p>
          </div>
        </div>
        <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${xpProgress}%`, background: "linear-gradient(90deg, #A8892B, #D4AF37)" }} />
        </div>
        <p className="text-xs mt-1" style={{ color: "#6B7585" }}>{xpToNext} XP para o próximo nível · {profile.xp.toLocaleString()} XP total</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Flame size={18} style={{ color: "#E8844A" }} />} label="Streak" value={`${profile.currentStreak}`} sub={`Recorde: ${profile.longestStreak}d`} iconBg="rgba(232,132,74,0.12)" />
        <StatCard icon={<BookOpen size={18} style={{ color: "#7C6BBD" }} />} label="Livros" value={`${profile.booksCompleted}`} sub={`${profile.totalPages} páginas`} iconBg="rgba(124,107,189,0.12)" />
        <StatCard icon={<Timer size={18} style={{ color: "#D94F4F" }} />} label="Pomodoros" value={`${profile.pomodorosTotal}`} sub="sessões" iconBg="rgba(217,79,79,0.12)" />
        <StatCard icon={<BookMarked size={18} style={{ color: "#D4AF37" }} />} label="Bíblia" value={`${profile.bibleChaptersTotal}`} sub="capítulos" iconBg="rgba(212,175,55,0.12)" />
      </div>

      {/* Achievements */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Trophy size={16} style={{ color: "#D4AF37" }} />
            Conquistas
          </h2>
          <span className="text-[10px]" style={{ color: "#8B95A5" }}>{profile.achievements.length}/{ACHIEVEMENTS.length}</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = profile.achievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                title={unlocked ? `${ach.label}: ${ach.description}` : "???"}
                className="rounded-xl p-2 flex flex-col items-center justify-center transition-all duration-300 cursor-default"
                style={{
                  background: unlocked ? `${ach.color}12` : "rgba(255,255,255,0.01)",
                  border: unlocked ? `1px solid ${ach.color}25` : "1px solid rgba(255,255,255,0.03)",
                  opacity: unlocked ? 1 : 0.3,
                }}
              >
                <Trophy size={14} style={{ color: unlocked ? ach.color : "#6B7585" }} />
                <p className="text-[8px] mt-1 text-center" style={{ color: unlocked ? ach.color : "#6B7585" }}>
                  {unlocked ? ach.label : "???"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, iconBg }: { icon: React.ReactNode; label: string; value: string; sub: string; iconBg: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "#6B7585" }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>{icon}</div>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[11px] mt-0.5" style={{ color: "#6B7585" }}>{sub}</p>
    </div>
  );
}
