"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  Trophy, Target, Flame, BookOpen, Users
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SkeletonFeed } from "@/components/Skeleton";
import { ErrorCard } from "@/components/ErrorCard";

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
  achievement_unlocked: { icon: Trophy, color: "#D4AF37", label: "Conquista" },
  challenge_completed: { icon: Target, color: "#3ABAB4", label: "Desafio" },
  streak_record: { icon: Flame, color: "#E8844A", label: "Streak" },
  book_finished: { icon: BookOpen, color: "#7C6BBD", label: "Livro" },
};

export default function FeedPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadFeed = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/feed?userId=${user!.id}&limit=50`)
      .then((r) => r.json())
      .then((data) => { if (data.events) setEvents(data.events); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadFeed();
  }, [loadFeed, user]);

  if (!mounted || loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-white/[0.04] animate-pulse" />
        <SkeletonFeed count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Users size={24} style={{ color: "#3ABAB4" }} /> Feed Social
        </h1>
        <ErrorCard onRetry={loadFeed} />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Users size={24} style={{ color: "#3ABAB4" }} />
          Feed Social
        </h1>
      </div>

      {events.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={48} className="mx-auto mb-4" style={{ color: "#6B7585" }} />
          <h3 className="text-lg font-medium text-white mb-2">Nenhuma atividade ainda</h3>
          <p className="text-sm" style={{ color: "#8B95A5" }}>
            Adicione amigos para ver suas conquistas aqui!
          </p>
          <Link href="/ranking" className="btn-primary mt-4 inline-flex text-sm">
            Ver Ranking
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
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
                    <span className="text-xs" style={{ color: "#6B7585" }}>{timeAgo}</span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: "#8B95A5" }}>
                    {getEventMessage(event)}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-lg shrink-0"
                  style={{ background: `${config.color}10`, color: config.color }}>
                  {config.label}
                </span>
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
