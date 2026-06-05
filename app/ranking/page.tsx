"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Star, Flame, Timer, BookOpen, Trophy
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorCard } from "@/components/ErrorCard";

interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  display_name: string | null;
  value: number;
  rank: number;
}

type Category = "xp" | "streak" | "pomodoros" | "pages";

const CATEGORIES: { id: Category; label: string; icon: typeof Star; color: string }[] = [
  { id: "xp", label: "XP", icon: Star, color: "#D4AF37" },
  { id: "streak", label: "Streak", icon: Flame, color: "#E8844A" },
  { id: "pomodoros", label: "Pomodoros", icon: Timer, color: "#D94F4F" },
  { id: "pages", label: "Páginas", icon: BookOpen, color: "#7C6BBD" },
];

export default function RankingPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("xp");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadRanking = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/leaderboard?category=${activeCategory}&limit=25`)
      .then((r) => r.json())
      .then((data) => { if (data.entries) setEntries(data.entries); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  useEffect(() => { loadRanking(); }, [loadRanking]);

  if (!mounted) return null;

  const activeConfig = CATEGORIES.find((c) => c.id === activeCategory)!;

  return (
    <div className="space-y-6 page-enter">
      <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
        <Trophy size={24} style={{ color: "#D4AF37" }} />
        Ranking
      </h1>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap",
              )}
              style={{
                background: isActive ? `${cat.color}12` : "rgba(255,255,255,0.02)",
                border: isActive ? `1px solid ${cat.color}25` : "1px solid rgba(255,255,255,0.04)",
                color: isActive ? cat.color : "#8B95A5",
              }}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <SkeletonList count={6} />
      ) : error ? (
        <ErrorCard onRetry={loadRanking} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          iconColor={activeConfig.color}
          title="Nenhum ranking disponível"
          description="Complete suas metas diárias para aparecer no ranking e comparar seu progresso com outros leitores!"
          primaryAction={{ label: "Ver meus livros", href: "/livros" }}
          secondaryAction={{ label: "Começar a ler", href: "/biblia" }}
        />
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const displayName = entry.display_name || entry.username || "Anônimo";
            const isTop3 = entry.rank <= 3;
            const medals = ["🥇", "🥈", "🥉"];

            return (
              <div key={entry.user_id}
                className="card flex items-center gap-4 p-4"
                style={isTop3 ? { background: `${activeConfig.color}06`, border: `1px solid ${activeConfig.color}15` } : {}}>
                <div className="w-10 text-center">
                  {isTop3 ? (
                    <span className="text-xl">{medals[entry.rank - 1]}</span>
                  ) : (
                    <span className="text-sm font-bold" style={{ color: "#6B7585" }}>#{entry.rank}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/u/${entry.username || ""}`} className="text-sm font-medium text-white hover:underline truncate">
                      {displayName}
                    </Link>
                    {entry.username && (
                      <span className="text-[10px]" style={{ color: "#6B7585" }}>@{entry.username}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: activeConfig.color }}>
                    {entry.value.toLocaleString()}
                  </p>
                  <p className="text-[10px]" style={{ color: "#6B7585" }}>{activeConfig.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}