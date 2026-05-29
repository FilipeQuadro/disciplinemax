"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { dataFetch } from "@/lib/data-fetch";
import {
  Users, Activity, Shield, CheckCircle2, Clock,
  BookOpen, BookMarked, Timer, TrendingUp, Zap, Crown,
  Ban, Trash2, RotateCcw, FileText, Unlock
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Stats {
  users: { total: number; activeToday: number; newThisWeek: number };
  metrics: { pagesToday: number; chaptersToday: number; pomodorosToday: number };
  plans: { free: number; pro: number; premium: number };
}

interface UserRow {
  id: string; joinedAt: string; lastActive: string | null;
  books: number; pomodoros: number; plan: string;
  blocked: boolean;
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
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: "block" | "unblock" | "reset_data" | "delete" } | null>(null);

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
  }

  async function manageUser(userId: string, action: "block" | "unblock" | "reset_data" | "delete") {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/manage`, {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: userId, action, actor_id: user?.id }),
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

  const confirmMessages: Record<string, { title: string; message: string }> = {
    block: { title: "Bloquear usuário?", message: "O usuário não poderá mais acessar o sistema." },
    unblock: { title: "Desbloquear usuário?", message: "O usuário voltará a ter acesso ao sistema." },
    reset_data: { title: "Resetar dados do usuário?", message: "Todos os dados serão apagados, mas a conta permanecerá ativa." },
    delete: { title: "DELETAR usuário?", message: "Esta ação é irreversível! A conta e todos os dados serão permanentemente removidos." },
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
      <div>
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Shield size={24} style={{ color: "#D4AF37" }} /> Painel Admin
        </h1>
        <p className="text-sm mt-1" style={{ color: "#555E6E" }}>Gerenciamento e monitoramento do sistema</p>
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
          <div className="grid grid-cols-3 gap-3">
            <AdminStat icon={<BookOpen size={18} style={{ color: "#7C6BBD" }} />} label="Capítulos Bíblia" value={stats.metrics.chaptersToday} cardClass="card-purple" />
            <AdminStat icon={<Timer size={18} style={{ color: "#D94F4F" }} />} label="Pomodoros" value={stats.metrics.pomodorosToday} cardClass="card-red" />
            <AdminStat icon={<BookMarked size={18} style={{ color: "#D4AF37" }} />} label="Usuários Free" value={stats.plans.free} cardClass="card-gold" />
          </div>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="card overflow-hidden">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={16} style={{ color: "#D4AF37" }} /> Lista de Usuários ({users.length})
          </h3>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>ID</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Cadastro</th>
                  <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Livros</th>
                  <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Pomodoros</th>
                  <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Plano</th>
                  <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td className="p-3 font-mono text-xs" style={{ color: "#8B95A5" }}>
                      {u.id.substring(0, 8)}...
                      {u.blocked && <span className="badge text-[9px] ml-1" style={{ background: "rgba(217,79,79,0.15)", color: "#D94F4F" }}>BLOQUEADO</span>}
                    </td>
                    <td className="p-3 text-xs" style={{ color: "#8B95A5" }}>{u.joinedAt ? format(new Date(u.joinedAt), "dd/MM/yyyy") : "—"}</td>
                    <td className="p-3 text-center text-xs" style={{ color: "#7C6BBD" }}>{u.books}</td>
                    <td className="p-3 text-center text-xs" style={{ color: "#D94F4F" }}>{u.pomodoros}</td>
                    <td className="p-3 text-center">
                      <span className="badge text-[10px]" style={{
                        background: u.plan === "premium" ? "rgba(212,175,55,0.12)" : u.plan === "pro" ? "rgba(124,107,189,0.12)" : "rgba(255,255,255,0.04)",
                        color: u.plan === "premium" ? "#D4AF37" : u.plan === "pro" ? "#7C6BBD" : "#8B95A5",
                      }}>{u.plan}</span>
                    </td>
                    <td className="p-3 text-center">
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
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td className="p-3 text-xs" style={{ color: "#8B95A5" }}>{format(new Date(log.created_at), "dd/MM HH:mm")}</td>
                    <td className="p-3 font-mono text-[11px]" style={{ color: "#8B95A5" }}>{log.actor_id?.substring(0, 8) || "system"}</td>
                    <td className="p-3">
                      <span className="badge text-[10px]" style={{
                        background: log.action.includes("block") || log.action.includes("delete") ? "rgba(217,79,79,0.1)" : "rgba(212,175,55,0.1)",
                        color: log.action.includes("block") || log.action.includes("delete") ? "#D94F4F" : "#D4AF37",
                      }}>{log.action}</span>
                    </td>
                    <td className="p-3 text-xs" style={{ color: "#8B95A5" }}>
                      {log.target_type || "—"}{log.target_id ? ` ${log.target_id.substring(0, 8)}...` : ""}
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

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction ? confirmMessages[confirmAction.action].title : ""}
        message={confirmAction ? confirmMessages[confirmAction.action].message : ""}
        confirmLabel={confirmAction?.action === "delete" ? "Deletar permanentemente" : confirmAction?.action === "block" ? "Bloquear" : confirmAction?.action === "unblock" ? "Desbloquear" : "Resetar"}
        destructive={confirmAction?.action === "delete" || confirmAction?.action === "block"}
        onConfirm={() => { if (confirmAction) { manageUser(confirmAction.userId, confirmAction.action); setConfirmAction(null); } }}
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
