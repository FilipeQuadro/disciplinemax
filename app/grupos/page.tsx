"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  Users, LogIn, LogOut, Trophy
} from "lucide-react";
import { toast } from "react-hot-toast";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorCard } from "@/components/ErrorCard";

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

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user!.id, action: "list" }),
      });
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
      if (data.userGroups) setUserGroups(data.userGroups);
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  async function joinGroup(groupId: string) {
    try {
      const res = await fetch("/api/groups", {
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
      const res = await fetch("/api/groups", {
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
      const res = await fetch("/api/groups", {
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
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-white/[0.04] animate-pulse" />
        <SkeletonList count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Users size={24} style={{ color: "#3ABAB4" }} /> Grupos
        </h1>
        <ErrorCard onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
        <Users size={24} style={{ color: "#3ABAB4" }} />
        Grupos
      </h1>

      {/* My Groups */}
      {userGroups.length > 0 ? (
        <div>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Users size={16} style={{ color: "#3ABAB4" }} />
            Meus Grupos
          </h2>
          <div className="space-y-2">
            {userGroups.map((group) => (
              <div key={group.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{group.name}</p>
                    {group.description && <p className="text-xs mt-0.5" style={{ color: "#8B95A5" }}>{group.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => showRanking(group.id)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#3ABAB4" }} aria-label="Ver ranking do grupo">
                      <Trophy size={16} />
                    </button>
                    <button onClick={() => leaveGroup(group.id)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#D94F4F" }} aria-label="Sair do grupo">
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
                {rankingGroupId === group.id && ranking.length > 0 && (
                  <div className="mt-3 space-y-1.5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    {ranking.slice(0, 10).map((r, i) => (
                      <div key={r.user_id} className="flex items-center justify-between py-1 px-2 rounded-lg" style={{ background: i === 0 ? "rgba(212,175,55,0.06)" : "transparent" }}>
                        <span className="text-xs" style={{ color: i === 0 ? "#D4AF37" : "#8B95A5" }}>
                          {i + 1}. {r.display_name || r.username || "Anônimo"}
                        </span>
                        <span className="text-xs font-bold" style={{ color: i === 0 ? "#D4AF37" : "#8B95A5" }}>
                          {r.xp.toLocaleString()} XP
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          iconColor="#3ABAB4"
          title="Nenhum grupo ainda"
          description="Entre em um grupo para compartilhar seu progresso e competir com outros leitores!"
          primaryAction={{ label: "Ver grupos disponíveis", href: "#all-groups" }}
        />
      )}

      {/* All Groups */}
      <div id="all-groups">
        <h2 className="font-semibold text-white mb-3">Todos os Grupos</h2>
        {groups.length === 0 ? (
          <EmptyState
            icon={Users}
            iconColor="#3ABAB4"
            title="Nenhum grupo disponível"
            description="Novos grupos serão adicionados em breve. Continue estudando enquanto isso!"
            primaryAction={{ label: "Ir para o Dashboard", href: "/" }}
          />
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="card p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{group.name}</p>
                  {group.description && <p className="text-xs mt-0.5" style={{ color: "#8B95A5" }}>{group.description}</p>}
                </div>
                {group.isMember ? (
                  <span className="text-[10px] px-3 py-1.5 rounded-lg font-medium" style={{ background: "rgba(58,186,180,0.1)", color: "#3ABAB4" }}>
                    Membro
                  </span>
                ) : (
                  <button
                    onClick={() => joinGroup(group.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 min-h-[44px]"
                    style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)", color: "#D4AF37" }}
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