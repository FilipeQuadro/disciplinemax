"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/auth-fetch";
import {
  Trophy, Target, Flame, BookOpen, Users
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SkeletonFeed } from "@/components/Skeleton";
import { ErrorCard } from "@/components/ErrorCard";
import { EmptyState } from "@/components/EmptyState";
import { HeroHeader } from "@/components/ui/HeroHeader";
import { Badge } from "@/components/ui/Badge";

interface FeedEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
  username?: string;
  display_name?: string;
}

const EVENT_ICONS: Record<string, { icon: typeof Trophy; color: string; label: string }> = {
  achievement_unlocked: { icon: Trophy, color: "var(--gold)", label: "Conquista" },
  challenge_completed: { icon: Target, color: "var(--accent-teal)", label: "Desafio" },
  streak_record: { icon: Flame, color: "var(--warning)", label: "Streak" },
  book_finished: { icon: BookOpen, color: "var(--accent-purple)", label: "Livro" },
};

export default function FeedPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadFeed = useCallback(() => {
    setLoading(true);
    setError(false);
    authFetch(`/api/feed?userId=${user!.id}&limit=50`)
      .then((r) => r.json())
      .then((data) => { if (data.events) setEvents(data.events); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadFeed();
  }, [loadFeed, user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <HeroHeader title="Feed Social" icon={Users} iconColor="var(--accent-teal)" />
        <SkeletonFeed count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <HeroHeader title="Feed Social" icon={Users} iconColor="var(--accent-teal)" />
        <ErrorCard onRetry={loadFeed} />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <HeroHeader title="Feed Social" icon={Users} iconColor="var(--accent-teal)" />

      {events.length === 0 ? (
        <EmptyState
          icon={Users}
          iconColor="var(--text-secondary)"
          title="Nenhuma atividade ainda"
          description="Adicione amigos para ver suas conquistas aqui!"
          primaryAction={{ label: "Ver Ranking", href: "/ranking" }}
        />
      ) : (
        <div className="stagger-children space-y-3">
          {events.map((event) => {
            const config = EVENT_ICONS[event.event_type] ?? EVENT_ICONS.achievement_unlocked;
            const Icon = config.icon;
            const userName = event.display_name || event.username || "Alguém";
            const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR });

            return (
              <div key={event.id} className="card flex items-start gap-3 p-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${config.color}12` }}>
                  <Icon size={18} style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/u/${event.username || ""}`} className="text-sm font-medium text-white hover:underline">
                      {userName}
                    </Link>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{timeAgo}</span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {getEventMessage(event)}
                  </p>
                </div>
                <Badge>{config.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getEventMessage(event: FeedEvent): string {
  switch (event.event_type) {
    case "achievement_unlocked":
      return `Desbloqueou a conquista "${event.event_data.achievement_id ?? ""}"!`;
    case "challenge_completed":
      return `Completou o desafio "${event.event_data.challenge_id ?? ""}"!`;
    case "streak_record":
      return `Alcançou ${event.event_data.streak ?? 0} dias de streak! 🔥`;
    case "book_finished":
      return `Terminou de ler um livro! 📚`;
    default:
      return "Realizou uma conquista!";
  }
}
