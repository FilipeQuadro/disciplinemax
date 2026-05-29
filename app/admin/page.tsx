"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { dataFetch } from "@/lib/data-fetch";
import {
  Users, Activity, Shield, CheckCircle2, Clock,
  BookOpen, BookMarked, Timer, TrendingUp, Zap, Crown,
  Ban, Trash2, RotateCcw, FileText, Unlock, Search,
  Mail, Star, Flame, AlertTriangle, RefreshCw, UserPlus,
  ChevronLeft, ChevronRight, Eye
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Stats {
  users: { total: number; activeToday: number; newThisWeek: number; blocked: number };
  metrics: { pagesToday: number; chaptersToday: number; pomodorosToday: number };
  plans: { free: number; pro: number; premium: number };
}

interface UserRow {
  id: string; joinedAt: string; lastActive: string | null;
  books: number; pomodoros: number; plan: string;
  blocked: boolean; isAdmin: boolean; adminRole: string | null; streak: number;
}

interface AuditLog {
  id: string; actor_id: string; action: string; target_type: string | null;
  target_id: string | null; details: any; created_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "audit" | "plans">("overview");
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: "block" | "unblock" | "reset_data" | "delete" | "add_admin" | "remove_admin" | "change_plan" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [planModal, setPlanModal] = useState<{ userId: string; currentPlan: string } | null>(null);

  useEffect(() => { checkAdmin(); }, [user]);

  async function getAuthHeaders(): Promise<Record<string, string>> {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async function checkAdmin() {
    if (!user) { setLoading(false); return; }
    const { data } = await dataFetch({ action: "select", table: "admin_users", filters: { eq: { user_id: user.id }, maybeSingle: true, select: "role" } });
    if (data) { setIsAdmin(true); loadData(); }
    setLoading(false);
  }

  async function loadData() {
    setRefreshing(true);
    try {
      const headers = await getAuthHeaders();
      const [statsRes, usersRes, auditRes] = await Promise.all([
        fetch(`/api/admin/stats`, { headers }),
        fetch(`/api/admin/users`, { headers }),
        fetch(`/api/admin/audit`, { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) { const d = await usersRes.json(); setUsers(d.users || []); }
      if (auditRes.ok) { const d = await auditRes.json(); setAuditLogs(d.logs || []); }
    } catch { /* silently fail */ }
    setRefreshing(false);
  }

  async function manageUser(userId: string, action: string, extra?: Record<string, any>) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/manage`, {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: userId, action, actor_id: user?.id, ...extra }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Ação "${action}" executada com sucesso!`);
        loadData();
      } else {
        toast.error(`Erro: ${data.error}`);
      }
    } catch { toast.error("Falha na requisição"); }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.id.toLowerCase().includes(q) || u.plan.toLowerCase().includes(q);
  });

  const confirmMessages: Record<string, { title: string; message: string }> = {
    block: { title: "Bloquear usuário?", message: "O usuário não poderá mais acessar o sistema." },
    unblock: { title: "Desbloquear usuário?", message: "O usuário voltará a ter acesso ao sistema." },
    reset_data: { title: "Resetar dados do usuário?", message: "Todos os dados serão apagados, mas a conta permanecerá ativa." },
    delete: { title: "DELETAR usuário?", message: "Esta ação é irreversível! A conta e todos os dados serão permanentemente removidos." },
    add_admin: { title: "Tornar administrador?", message: "Este usuário terá acesso total ao painel admin." },
    remove_admin: { title: "Remover privilégios de admin?", message: "Este usuário perderá acesso ao painel admin." },
    change_plan: { title: "Alterar plano?", message: "O plano do usuário será alterado imediatamente." },
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p style={{ color: "#555E6E" }}>Verificando permissões...</p></div>;
  if (!isAdmin) return <div className="flex items-center justify-center h-64"><p style={{ color: "#D94F4F" }}>Acesso restrito a administradores</p></div>;

  const tabs = [
    { key: "overview" as const, label: "Visão Geral", icon: TrendingUp },
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "audit" as const, label: "Auditoria", icon: FileText },
    { key: "plans" as const, label: "Planos", icon: Crown },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <Shield size={24} style={{ color: "#D4AF37" }} /> Painel Admin
          </h1>
          <p className="text-sm mt-1" style={{ color: "#555E6E" }}>Gerenciamento e monitoramento do sistema</p>
        </div>
        <button onClick={loadData} disabled={refreshing} className="btn-ghost text-sm flex items-center gap-2">
          <RefreshCw size={14} className={clsx(refreshing && "animate-spin")} /> Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 min-w-0 whitespace-nowrap px-2")}
            style={{ background: tab === t.key ? "rgba(255,255,255,0.06)" : "transparent", color: tab === t.key ? "#F0F0F0" : "#555E6E" }}>
            <t.icon size={14} /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AdminStat icon={<Users size={18} style={{ color: "#D4AF37" }} />} label="Total Usuários" value={stats.users.total} cardClass="card-gold" />
            <AdminStat icon={<Activity size={18} style={{ color: "#3ABAB4" }} />} label="Ativos Hoje" value={stats.users.activeToday} cardClass="card-teal" />
            <AdminStat icon={<Zap size={18} style={{ color: "#7C6BBD" }} />} label="Novos Semana" value={stats.users.newThisWeek} cardClass="card-purple" />
            <AdminStat icon={<Clock size={18} style={{ color: "#E8844A" }} />} label="Páginas Hoje" value={stats.metrics.pagesToday} cardClass="card-orange" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AdminStat icon={<BookOpen size={18} style={{ color: "#7C6BBD" }} />} label="Capítulos Bíblia" value={stats.metrics.chaptersToday} cardClass="card-purple" />
            <AdminStat icon={<Timer size={18} style={{ color: "#D94F4F" }} />} label="Pomodoros" value={stats.metrics.pomodorosToday} cardClass="card-red" />
            <AdminStat icon={<BookMarked size={18} style={{ color: "#D4AF37" }} />} label="Free" value={stats.plans.free} cardClass="card-gold" />
            <AdminStat icon={<AlertTriangle size={18} style={{ color: "#D94F4F" }} />} label="Bloqueados" value={stats.users.blocked} cardClass="card-red" />
          </div>
          {/* Quick actions */}
          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Zap size={16} style={{ color: "#D4AF37" }} /> Ações Rápidas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickAction icon={<FileText size={16} />} label="Diagnóstico" onClick={() => { fetch("/api/admin/diagnostics", { headers: { Authorization: `Bearer ${supabase?.auth.getSession()?.then?.(s => s.data.session?.access_token) || ""}` } }).then(r => r.json()).then(d => toast.success(d.services ? "Verifique o console" : "Erro no diagnóstico")).catch(() => toast.error("Falha")); }} />
              <QuickAction icon={<Activity size={16} />} label="Health Check" onClick={() => { fetch("/api/health", { headers: { Authorization: `Bearer ${supabase?.auth.getSession()?.then?.(s => s.data.session?.access_token) || ""}` } }).then(r => r.json()).then(d => toast[d.ok ? "success" : "error"](d.ok ? "Sistema saudável!" : "Problemas detectados")).catch(() => toast.error("Falha")); }} />
              <QuickAction icon={<Mail size={16} />} label="Migrar DB" onClick={() => { fetch("/api/migrate", { headers: { Authorization: `Bearer ${supabase?.auth.getSession()?.then?.(s => s.data.session?.access_token) || ""}` } }).then(r => r.json()).then(d => toast[d.ok ? "success" : "error"](d.ok ? "Migrações verificadas" : "Erro")).catch(() => toast.error("Falha")); }} />
              <QuickAction icon={<RefreshCw size={16} />} label="Recarregar" onClick={loadData} />
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#555E6E" }} />
              <input
                className="input pl-10"
                placeholder="Buscar por ID ou plano..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span className="text-xs whitespace-nowrap" style={{ color: "#555E6E" }}>
              {filteredUsers.length} de {users.length}
            </span>
          </div>

          {/* User table */}
          <div className="card overflow-hidden">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={16} style={{ color: "#D4AF37" }} /> Usuários ({filteredUsers.length})
            </h3>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>ID</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Cadastro</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Streak</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Livros</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Pomodoros</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Plano</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Status</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      onClick={() => setSelectedUser(u)}>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs" style={{ color: "#8B95A5" }}>{u.id.substring(0, 8)}...</span>
                          {u.isAdmin && (
                            <span className="badge text-[9px]" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}>
                              <Shield size={8} className="inline mr-0.5" /> {u.adminRole || "admin"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-xs" style={{ color: "#8B95A5" }}>
                        {u.joinedAt ? format(new Date(u.joinedAt), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="p-3 text-center">
                        {u.streak > 0 ? (
                          <span className="text-xs font-semibold flex items-center justify-center gap-1" style={{ color: "#E8844A" }}>
                            <Flame size={12} /> {u.streak}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "#555E6E" }}>0</span>
                        )}
                      </td>
                      <td className="p-3 text-center text-xs" style={{ color: "#7C6BBD" }}>{u.books}</td>
                      <td className="p-3 text-center text-xs" style={{ color: "#D94F4F" }}>{u.pomodoros}</td>
                      <td className="p-3 text-center">
                        <button onClick={(e) => { e.stopPropagation(); setPlanModal({ userId: u.id, currentPlan: u.plan }); }}
                          className="badge text-[10px] hover:opacity-80 transition-opacity" style={{
                            background: u.plan === "premium" ? "rgba(212,175,55,0.12)" : u.plan === "pro" ? "rgba(124,107,189,0.12)" : "rgba(255,255,255,0.04)",
                            color: u.plan === "premium" ? "#D4AF37" : u.plan === "pro" ? "#7C6BBD" : "#8B95A5",
                          }}>{u.plan}</button>
                      </td>
                      <td className="p-3 text-center">
                        {u.blocked ? (
                          <span className="badge text-[10px]" style={{ background: "rgba(217,79,79,0.15)", color: "#D94F4F" }}>BLOQUEADO</span>
                        ) : (
                          <span className="badge text-[10px]" style={{ background: "rgba(58,186,180,0.1)", color: "#3ABAB4" }}>Ativo</span>
                        )}
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {u.blocked ? (
                            <button onClick={() => setConfirmAction({ userId: u.id, action: "unblock" })} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#3ABAB4" }} title="Desbloquear">
                              <Unlock size={13} />
                            </button>
                          ) : (
                            <button onClick={() => setConfirmAction({ userId: u.id, action: "block" })} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#E8844A" }} title="Bloquear">
                              <Ban size={13} />
                            </button>
                          )}
                          {!u.isAdmin ? (
                            <button onClick={() => setConfirmAction({ userId: u.id, action: "add_admin" })} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#D4AF37" }} title="Tornar Admin">
                              <Shield size={13} />
                            </button>
                          ) : (
                            <button onClick={() => setConfirmAction({ userId: u.id, action: "remove_admin" })} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555E6E" }} title="Remover Admin">
                              <Shield size={13} className="opacity-40" />
                            </button>
                          )}
                          <button onClick={() => setConfirmAction({ userId: u.id, action: "reset_data" })} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#7C6BBD" }} title="Resetar dados">
                            <RotateCcw size={13} />
                          </button>
                          <button onClick={() => setConfirmAction({ userId: u.id, action: "delete" })} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#D94F4F" }} title="Deletar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Audit */}
      {tab === "audit" && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <FileText size={16} style={{ color: "#D4AF37" }} /> Logs de Auditoria ({auditLogs.length})
          </h3>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Data</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Ator</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Ação</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Alvo</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td className="p-3 text-xs" style={{ color: "#8B95A5" }}>{format(new Date(log.created_at), "dd/MM HH:mm")}</td>
                    <td className="p-3 font-mono text-[11px]" style={{ color: "#8B95A5" }}>{log.actor_id?.substring(0, 8) || "system"}</td>
                    <td className="p-3">
                      <span className="badge text-[10px]" style={{
                        background: log.action.includes("block") || log.action.includes("delete") ? "rgba(217,79,79,0.1)" : log.action.includes("admin") ? "rgba(212,175,55,0.1)" : "rgba(58,186,180,0.1)",
                        color: log.action.includes("block") || log.action.includes("delete") ? "#D94F4F" : log.action.includes("admin") ? "#D4AF37" : "#3ABAB4",
                      }}>{log.action}</span>
                    </td>
                    <td className="p-3 text-xs" style={{ color: "#8B95A5" }}>
                      {log.target_type || "—"}{log.target_id ? ` ${log.target_id.substring(0, 8)}...` : ""}
                    </td>
                    <td className="p-3 text-xs max-w-[200px] truncate" style={{ color: "#555E6E" }}>
                      {log.details ? JSON.stringify(log.details).substring(0, 60) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plans */}
      {tab === "plans" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { plan: "free", label: "Free", color: "#8B95A5", count: stats.plans.free },
              { plan: "pro", label: "Pro", color: "#7C6BBD", count: stats.plans.pro },
              { plan: "premium", label: "Premium", color: "#D4AF37", count: stats.plans.premium },
            ].map((p) => (
              <div key={p.plan} className="card text-center">
                <Crown size={24} className="mx-auto mb-2" style={{ color: p.color }} />
                <h3 className="font-semibold text-white">{p.label}</h3>
                <p className="text-3xl font-bold mt-2" style={{ color: p.color }}>{p.count}</p>
                <p className="text-xs mt-1" style={{ color: "#555E6E" }}>usuários</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}
            style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Eye size={16} style={{ color: "#D4AF37" }} /> Detalhes do Usuário
              </h3>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "#555E6E" }}>✕</button>
            </div>
            <div className="space-y-3">
              <DetailRow label="ID" value={selectedUser.id} mono />
              <DetailRow label="Cadastro" value={selectedUser.joinedAt ? format(new Date(selectedUser.joinedAt), "dd/MM/yyyy HH:mm") : "—"} />
              <DetailRow label="Último acesso" value={selectedUser.lastActive || "—"} />
              <DetailRow label="Plano" value={selectedUser.plan} />
              <DetailRow label="Streak" value={`${selectedUser.streak} dias`} />
              <DetailRow label="Livros" value={`${selectedUser.books}`} />
              <DetailRow label="Pomodoros" value={`${selectedUser.pomodoros}`} />
              <DetailRow label="Admin" value={selectedUser.isAdmin ? `Sim (${selectedUser.adminRole})` : "Não"} />
              <DetailRow label="Status" value={selectedUser.blocked ? "Bloqueado" : "Ativo"} />
            </div>
            <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {!selectedUser.isAdmin && (
                <button onClick={() => { setConfirmAction({ userId: selectedUser.id, action: "add_admin" }); setSelectedUser(null); }}
                  className="btn-ghost text-xs flex items-center gap-1" style={{ color: "#D4AF37" }}>
                  <Shield size={12} /> Tornar Admin
                </button>
              )}
              <button onClick={() => { setPlanModal({ userId: selectedUser.id, currentPlan: selectedUser.plan }); setSelectedUser(null); }}
                className="btn-ghost text-xs flex items-center gap-1" style={{ color: "#7C6BBD" }}>
                <Crown size={12} /> Alterar Plano
              </button>
              <button onClick={() => { navigator.clipboard.writeText(selectedUser.id); toast.success("ID copiado!"); }}
                className="btn-ghost text-xs flex items-center gap-1" style={{ color: "#555E6E" }}>
                📋 Copiar ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Change Modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPlanModal(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}
            style={{ background: "#141820", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="font-semibold text-white">Alterar Plano</h3>
            <div className="grid grid-cols-3 gap-2">
              {(["free", "pro", "premium"] as const).map((plan) => (
                <button key={plan} onClick={() => { manageUser(planModal.userId, "change_plan", { new_plan: plan }); setPlanModal(null); }}
                  className={clsx("p-3 rounded-xl text-center transition-all duration-200")}
                  style={{
                    background: planModal.currentPlan === plan ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)",
                    border: planModal.currentPlan === plan ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(255,255,255,0.05)",
                    color: planModal.currentPlan === plan ? "#D4AF37" : "#8B95A5",
                  }}>
                  <p className="text-sm font-semibold capitalize">{plan}</p>
                  {planModal.currentPlan === plan && <p className="text-[9px] mt-0.5">(atual)</p>}
                </button>
              ))}
            </div>
            <button onClick={() => setPlanModal(null)} className="btn-ghost w-full text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction ? confirmMessages[confirmAction.action].title : ""}
        message={confirmAction ? confirmMessages[confirmAction.action].message : ""}
        confirmLabel={confirmAction?.action === "delete" ? "Deletar permanentemente" : confirmAction?.action === "block" ? "Bloquear" : confirmAction?.action === "unblock" ? "Desbloquear" : confirmAction?.action === "add_admin" ? "Tornar Admin" : confirmAction?.action === "remove_admin" ? "Remover Admin" : confirmAction?.action === "change_plan" ? "Alterar" : "Resetar"}
        destructive={confirmAction?.action === "delete" || confirmAction?.action === "block"}
        onConfirm={() => {
          if (confirmAction) {
            manageUser(confirmAction.userId, confirmAction.action);
            setConfirmAction(null);
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

function AdminStat({ icon, label, value, cardClass }: any) {
  return (
    <div className={clsx("stat-card", cardClass)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "#555E6E" }}>{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold text-white count-up">{value}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "#8B95A5" }}>
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <span className="text-xs" style={{ color: "#555E6E" }}>{label}</span>
      <span className={clsx("text-xs text-white", mono && "font-mono")}>{value}</span>
    </div>
  );
}
