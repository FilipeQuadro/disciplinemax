"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Star, Flame, Timer, BookOpen, Trophy
} from "lucide-react";
import Link from "next/link";
import { HeroHeader } from "@/components/ui/HeroHeader";
import { GradientCard } from "@/components/ui/GradientCard";
import { Badge } from "@/components/ui/Badge";
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
  { id: "xp", label: "XP", icon: Star, color: "var(--gold)" },
  { id: "streak", label: "Streak", icon: Flame, color: "var(--accent-orange)" },
  { id: "pomodoros", label: "Pomodoros", icon: Timer, color: "var(--accent-red)" },
  { id: "pages", label: "Páginas", icon: BookOpen, color: "var(--accent-purple)" },
];

const categoryToCardVariant: Record<Category, "gold" | "orange" | "red" | "purple"> = {
  xp: "gold",
  streak: "orange",
  pomodoros: "red",
  pages: "purple",
};

const categoryToBadgeVariant: Record<Category, "level" | "streak" | "xp" | "default"> = {
  xp: "level",
  streak: "streak",
  pomodoros: "default",
  pages: "xp",
};

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
    <div className="space-y-8 page-enter">
      <HeroHeader
        icon={Trophy}
        iconColor="var(--gold)"
        title="Ranking"
        showDate={false}
      />

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              role="tab"
              aria-selected={isActive}
              className={
                isActive
                  ? "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
                  : "glass flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
              }
              style={
                isActive
                  ? {
                      background: `color-mix(in srgb, ${cat.color} 7%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${cat.color} 15%, transparent)`,
                      color: cat.color,
                    }
                  : { color: "var(--text-secondary)" }
              }
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Leaderboard */}
      <div role="tabpanel">
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
        <div className="space-y-2 stagger-children">
          {entries.map((entry) => {
            const displayName = entry.display_name || entry.username || "Anônimo";
            const isTop3 = entry.rank <= 3;
            const medals = ["🥇", "🥈", "🥉"];
            const cardVariant = categoryToCardVariant[activeCategory];

            return (
              <div key={entry.user_id}>
                {isTop3 ? (
                  <GradientCard
                    variant={cardVariant}
                    className="flex items-center gap-4 p-4"
                  >
                    <div className="w-10 text-center">
                      <span className="text-xl">{medals[entry.rank - 1]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/u/${entry.username || ""}`}
                          className="text-sm font-medium text-white hover:underline truncate"
                        >
                          {displayName}
                        </Link>
                        {entry.username && (
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            @{entry.username}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tracking-tight" style={{ color: activeConfig.color }}>
                        {entry.value.toLocaleString()}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        {activeConfig.label}
                      </p>
                    </div>
                  </GradientCard>
                ) : (
                  <div className="card flex items-center gap-4 p-4">
                    <div className="w-10 text-center">
                      <Badge variant={categoryToBadgeVariant[activeCategory]}>
                        #{entry.rank}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/u/${entry.username || ""}`}
                          className="text-sm font-medium text-white hover:underline truncate"
                        >
                          {displayName}
                        </Link>
                        {entry.username && (
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            @{entry.username}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tracking-tight" style={{ color: activeConfig.color }}>
                        {entry.value.toLocaleString()}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        {activeConfig.label}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
