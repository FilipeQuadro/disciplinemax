"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/auth-fetch";
import {
  Users, LogIn, LogOut, Trophy
} from "lucide-react";
import { toast } from "react-hot-toast";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorCard } from "@/components/ErrorCard";
import { HeroHeader } from "@/components/ui/HeroHeader";
import { GradientCard } from "@/components/ui/GradientCard";
import { Badge } from "@/components/ui/Badge";

interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
  isMember?: boolean;
}

interface GroupRankingEntry {
  user_id: string;
  username: string | null;
  display_name: string | null;
  xp: number;
}

export default function GruposPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [rankingGroupId, setRankingGroupId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<GroupRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user!.id, action: "list" }),
      });
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
      if (data.userGroups) setUserGroups(data.userGroups);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [loadData, user]);

  async function joinGroup(groupId: string) {
    try {
      const res = await authFetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user!.id, action: "join", groupId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Entrou no grupo! 🎉");
        loadData();
      }
    } catch { /* ignore */ }
  }

  async function leaveGroup(groupId: string) {
    try {
      const res = await authFetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user!.id, action: "leave", groupId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Saiu do grupo");
        setRankingGroupId(null);
        loadData();
      }
    } catch { /* ignore */ }
  }

  async function showRanking(groupId: string) {
    if (rankingGroupId === groupId) {
      setRankingGroupId(null);
      setRanking([]);
      return;
    }
    try {
      const res = await authFetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user!.id, action: "ranking", groupId }),
      });
      const data = await res.json();
      if (data.ranking) {
        setRankingGroupId(groupId);
        setRanking(data.ranking);
      }
    } catch { /* ignore */ }
  }

  if (!mounted || loading) {
    return (
      <div className="space-y-6 page-enter">
        <div className="h-8 w-48 rounded bg-[var(--border)] animate-pulse" />
        <SkeletonList count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 page-enter">
        <HeroHeader
          title="Grupos"
          icon={Users}
          iconColor="var(--accent-teal)"
          showDate={false}
        />
        <ErrorCard onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <HeroHeader
        title="Grupos"
        icon={Users}
        iconColor="var(--accent-teal)"
        showDate={false}
      />

      {/* My Groups */}
      {userGroups.length > 0 ? (
        <div>
          <h2 className="font-semibold tracking-tight text-white mb-3 flex items-center gap-2">
            <Users size={16} className="text-[var(--accent-teal)]" />
            Meus Grupos
          </h2>
          <div className="space-y-2 stagger-children">
            {userGroups.map((group) => (
              <GradientCard key={group.id} variant="teal">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{group.name}</p>
                    {group.description && (
                      <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => showRanking(group.id)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-[var(--accent-teal)]"
                      aria-label="Ver ranking do grupo"
                    >
                      <Trophy size={16} />
                    </button>
                    <button
                      onClick={() => leaveGroup(group.id)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-[var(--danger)]"
                      aria-label="Sair do grupo"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
                {rankingGroupId === group.id && ranking.length > 0 && (
                  <div className="mt-3 space-y-1.5 pt-3 border-t border-[var(--border)]">
                    {ranking.slice(0, 10).map((r, i) => (
                      <div
                        key={r.user_id}
                        className={`flex items-center justify-between py-1 px-2 rounded-lg ${i === 0 ? "bg-[var(--gold-glow)]" : ""}`}
                      >
                        <span
                          className={`text-xs ${i === 0 ? "text-[var(--gold)]" : "text-[var(--text-muted)]"}`}
                        >
                          {i + 1}. {r.display_name || r.username || "Anônimo"}
                        </span>
                        <span
                          className={`text-xs font-bold ${i === 0 ? "text-[var(--gold)]" : "text-[var(--text-muted)]"}`}
                        >
                          {r.xp.toLocaleString()} XP
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </GradientCard>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          iconColor="var(--accent-teal)"
          title="Nenhum grupo ainda"
          description="Entre em um grupo para compartilhar seu progresso e competir com outros leitores!"
          primaryAction={{ label: "Ver grupos disponíveis", href: "#all-groups" }}
        />
      )}

      {/* All Groups */}
      <div id="all-groups">
        <h2 className="font-semibold tracking-tight text-white mb-3">Todos os Grupos</h2>
        {groups.length === 0 ? (
          <EmptyState
            icon={Users}
            iconColor="var(--accent-teal)"
            title="Nenhum grupo disponível"
            description="Novos grupos serão adicionados em breve. Continue estudando enquanto isso!"
            primaryAction={{ label: "Ir para o Dashboard", href: "/" }}
          />
        ) : (
          <div className="space-y-2 stagger-children">
            {groups.map((group) => (
              <div key={group.id} className="card p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{group.name}</p>
                  {group.description && (
                    <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                      {group.description}
                    </p>
                  )}
                </div>
                {group.isMember ? (
                  <Badge variant="default">Membro</Badge>
                ) : (
                  <button
                    onClick={() => joinGroup(group.id)}
                    className="btn-primary flex items-center gap-1.5 text-xs min-h-[44px]"
                  >
                    <LogIn size={12} /> Entrar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
