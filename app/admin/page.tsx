"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  Users, Activity, Shield, CheckCircle2, XCircle, Clock,
  BookOpen, BookMarked, Timer, TrendingUp, Zap, FlameKindling, Crown,
  Ban, Trash2, RotateCcw, AlertTriangle, Bot, FileText, Unlock
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

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

interface DiagnosticResult {
  ok: boolean; timestamp: string; issues: DiagnosticIssue[]; fixes: string[];
  aiAnalysis: string | null; tableStatus: Record<string, boolean>;
}

interface DiagnosticIssue {
  severity: "critical" | "warning" | "info";
  area: string; message: string; autoFixed?: boolean;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [diag, setDiag] = useState<DiagnosticResult | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "diag" | "audit" | "plans">("overview");
  const [diagRunning, setDiagRunning] = useState(false);

  const secret = process.env.NEXT_PUBLIC_CRON_SECRET || "";

  useEffect(() => { checkAdmin(); }, [user]);

  async function getAuthHeaders(): Promise<Record<string, string>> {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async function checkAdmin() {
    if (!user || !supabase) { setLoading(false); return; }
    const { data } = await supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
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

  async function runDiagnostic() {
    setDiagRunning(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/ai-diagnostic`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDiag(data);
        if (data.issues?.length > 0) toast(`🔍 ${data.issues.length} problema(s) encontrado(s)`, { icon: "⚠️" });
        else toast.success("✅ Sistema saudável!");
      }
    } catch { toast.error("Falha ao executar diagnóstico"); }
    setDiagRunning(false);
  }

  async function manageUser(userId: string, action: "block" | "unblock" | "reset_data" | "delete") {
    const confirmMsg = {
      block: "Bloquear este usuário?",
      unblock: "Desbloquear este usuário?",
      reset_data: "Resetar TODOS os dados deste usuário? (conta permanece)",
      delete: "DELETAR este usuário completamente? Esta ação é irreversível!",
    }[action];

    if (!confirm(confirmMsg)) return;

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

  if (loading) return <div className="flex items-center justify-center h-64"><p style={{ color: "#555E6E" }}>Verificando permissões...</p></div>;
  if (!isAdmin) return <div className="flex items-center justify-center h-64"><p style={{ color: "#D94F4F" }}>Acesso restrito a administradores</p></div>;

  const tabs = [
    { key: "overview" as const, label: "Visão Geral", icon: TrendingUp },
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "diag" as const, label: "IA Diagnóstico", icon: Bot },
    { key: "audit" as const, label: "Auditoria", icon: FileText },
    { key: "plans" as const, label: "Planos", icon: Crown },
  ];

  return (
    <div className="space-y-6 page-enter stagger-children">
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
                          <button onClick={() => manageUser(u.id, "unblock")} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#3ABAB4" }} title="Desbloquear">
                            <Unlock size={13} />
                          </button>
                        ) : (
                          <button onClick={() => manageUser(u.id, "block")} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#E8844A" }} title="Bloquear">
                            <Ban size={13} />
                          </button>
                        )}
                        <button onClick={() => manageUser(u.id, "reset_data")} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#7C6BBD" }} title="Resetar dados">
                          <RotateCcw size={13} />
                        </button>
                        <button onClick={() => manageUser(u.id, "delete")} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#D94F4F" }} title="Deletar">
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

      {/* AI Diagnostic */}
      {tab === "diag" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Bot size={16} style={{ color: "#D4AF37" }} /> IA Diagnóstico Automático
              </h3>
              <button onClick={runDiagnostic} disabled={diagRunning}
                className="btn-primary text-sm flex items-center gap-2">
                {diagRunning ? (
                  <><div className="w-4 h-4 border-2 border-[#0B0E14]/20 border-t-[#0B0E14] rounded-full animate-spin" /> Analisando...</>
                ) : (
                  <><Zap size={14} /> Executar Diagnóstico</>
                )}
              </button>
            </div>

            {diag && (
              <div className="space-y-4">
                {/* Status geral */}
                <div className={clsx("p-4 rounded-xl flex items-center gap-3")}
                  style={{
                    background: diag.ok ? "rgba(58,186,180,0.06)" : "rgba(217,79,79,0.06)",
                    border: diag.ok ? "1px solid rgba(58,186,180,0.2)" : "1px solid rgba(217,79,79,0.2)",
                  }}>
                  {diag.ok ? <CheckCircle2 size={20} style={{ color: "#3ABAB4" }} /> : <XCircle size={20} style={{ color: "#D94F4F" }} />}
                  <div>
                    <p className="font-medium text-white">{diag.ok ? "Sistema saudável" : "Problemas detectados"}</p>
                    <p className="text-xs" style={{ color: "#555E6E" }}>
                      {diag.issues.length} problema(s) · {diag.fixes.length} auto-corrigido(s) · {format(new Date(diag.timestamp), "dd/MM HH:mm")}
                    </p>
                  </div>
                </div>

                {/* AI Analysis */}
                {diag.aiAnalysis && (
                  <div className="p-4 rounded-xl" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
                    <p className="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#D4AF37" }}>
                      <Bot size={11} /> Análise da IA
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "#C8CCD4" }}>{diag.aiAnalysis}</p>
                  </div>
                )}

                {/* Issues */}
                {diag.issues.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#555E6E" }}>Problemas Encontrados</p>
                    {diag.issues.map((issue: DiagnosticIssue, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        {issue.severity === "critical" ? <XCircle size={16} className="shrink-0 mt-0.5" style={{ color: "#D94F4F" }} /> :
                         issue.severity === "warning" ? <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "#E8844A" }} /> :
                         <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: "#3ABAB4" }} />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: "#8B95A5" }}>{issue.area}</span>
                            {issue.autoFixed && <span className="badge text-[9px]" style={{ background: "rgba(58,186,180,0.12)", color: "#3ABAB4" }}>auto-corrigido</span>}
                          </div>
                          <p className="text-sm text-white">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fixes */}
                {diag.fixes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#3ABAB4" }}>Auto-Corrigido</p>
                    {diag.fixes.map((fix: string, i: number) => (
                      <div key={i} className="p-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(58,186,180,0.04)", border: "1px solid rgba(58,186,180,0.08)" }}>
                        <CheckCircle2 size={14} style={{ color: "#3ABAB4" }} />
                        <p className="text-sm" style={{ color: "#8B95A5" }}>{fix}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Table status */}
                {diag.tableStatus && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#555E6E" }}>Status das Tabelas</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(diag.tableStatus).map(([table, ok]) => (
                        <span key={table} className="badge text-[10px]" style={{
                          background: ok ? "rgba(58,186,180,0.08)" : "rgba(217,79,79,0.08)",
                          color: ok ? "#3ABAB4" : "#D94F4F",
                        }}>
                          {ok ? "✓" : "✗"} {table}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
                        background: log.action.includes("block") ? "rgba(217,79,79,0.1)" :
                          log.action.includes("delete") ? "rgba(217,79,79,0.1)" :
                            log.action.includes("diagnostic") ? "rgba(124,107,189,0.1)" :
                              "rgba(212,175,55,0.1)",
                        color: log.action.includes("block") ? "#D94F4F" :
                          log.action.includes("delete") ? "#D94F4F" :
                            log.action.includes("diagnostic") ? "#7C6BBD" : "#D4AF37",
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
