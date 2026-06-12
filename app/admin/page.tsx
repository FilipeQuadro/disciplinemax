"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { dataFetch } from "@/lib/data-fetch";
import {
  Users, Activity, Shield, CheckCircle2, Clock,
  BookOpen, BookMarked, Timer, TrendingUp, Zap, Crown,
  Ban, Trash2, RotateCcw, FileText, Unlock, Search,
  Mail, Star, Flame, AlertTriangle, RefreshCw, UserPlus,
  ChevronLeft, ChevronRight, Eye, X, ChevronDown,
  AlertCircle, CheckCircle, XCircle, Info, Settings,
  BarChart3, Wifi, WifiOff, Copy, ExternalLink,
  Bell, MessageSquare, Database, Cpu, Globe, Key,
  CalendarDays, TrendingDown, UserCheck, UserX,
  PieChart, Layers, ArrowUpRight, ArrowDownRight, Percent,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────
interface Stats {
  users: {
    total: number; activeToday: number; activeThisWeek: number;
    newThisWeek: number; newThisMonth: number; blocked: number;
    engagementRate: number; weeklyRetention: number;
  };
  metrics: {
    today: { pages: number; chapters: number; pomodoros: number; focusMin: number };
    week: { pages: number; chapters: number; pomodoros: number; focusMin: number };
    totalBooks: number; totalPomodoroSessions: number;
  };
  plans: { free: number; pro: number; premium: number };
  trend: { date: string; pages: number; chapters: number; pomodoros: number }[];
}

interface UserRow {
  id: string; email: string; name: string; joinedAt: string;
  lastActive: string | null; books: number; pomodoros: number;
  plan: string; blocked: boolean; blockedReason: string | null;
  isAdmin: boolean; adminRole: string | null; streak: number;
  totalPages: number; totalChapters: number; totalFocusMin: number;
}

interface AuditLog {
  id: string; actor_id: string; action: string; target_type: string | null;
  target_id: string | null; details: any; created_at: string;
}

interface DiagnosticCheck {
  status: "healthy" | "warning" | "error" | "disabled";
  name: string;
  description: string;
  explanation: string;
  suggestion: string;
  latency_ms?: number;
  details?: Record<string, any>;
}

interface DiagnosticsData {
  status: "healthy" | "warning" | "error";
  timestamp: string;
  checks: DiagnosticCheck[];
  issues: string[];
  summary: { healthy: number; warnings: number; errors: number; disabled: number };
}

interface AnalyticsData {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  active_streak_users: number;
  notifications_sent: number;
  notifications_delivered: number;
  notifications_failed: number;
  average_streak: number;
  average_daily_pages: number;
  average_daily_pomodoros: number;
  retention_7d: number;
  retention_30d: number;
  total_users: number;
  new_users_today: number;
  new_users_this_week: number;
  captured_at: string;
}

// ── Main Component ─────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [tab, setTab] = useState<"overview" | "users" | "diagnostics" | "audit" | "plans" | "analytics">("overview");
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: "block" | "unblock" | "reset_data" | "delete" | "add_admin" | "remove_admin" | "change_plan" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [planModal, setPlanModal] = useState<{ userId: string; currentPlan: string } | null>(null);
  const [pagination, setPagination] = useState<{ page: number; perPage: number; total: number; totalPages: number }>({ page: 1, perPage: 50, total: 0, totalPages: 1 });
  const [auditFilter, setAuditFilter] = useState("");
  const [expandedDiagnostic, setExpandedDiagnostic] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<"healthy" | "warning" | "error" | "loading">("loading");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  const loadDataRef = useRef<() => void>(() => {});

  const checkAdmin = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await dataFetch({ action: "select", table: "admin_users", filters: { eq: { user_id: user.id }, maybeSingle: true, select: "role" } });
    if (data) { setIsAdmin(true); loadDataRef.current(); }
    setLoading(false);
  }, [user]);

  useEffect(() => { checkAdmin(); }, [checkAdmin]);

  async function getAuthHeaders(): Promise<Record<string, string>> {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async function loadData() {
    setRefreshing(true);
    try {
      const headers = await getAuthHeaders();
      const [statsRes, usersRes, auditRes] = await Promise.all([
        fetch(`/api/admin/stats`, { headers }),
        fetch(`/api/admin/users?page=${pagination.page}&per_page=${pagination.perPage}&search=${encodeURIComponent(searchQuery)}`, { headers }),
        fetch(`/api/admin/audit${auditFilter ? `?action=${auditFilter}` : ""}`, { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users || []);
        setPagination(d.pagination || { page: 1, perPage: 50, total: 0, totalPages: 1 });
      }
      if (auditRes.ok) { const d = await auditRes.json(); setAuditLogs(d.logs || []); }

      // Quick health check
      const diagRes = await fetch(`/api/admin/diagnostics`, { headers });
      if (diagRes.ok) {
        const diagData = await diagRes.json();
        setDiagnostics(diagData);
        setSystemHealth(diagData.status);
      }
    } catch { /* silently fail */ }
    setRefreshing(false);
  }
  loadDataRef.current = loadData;

  async function loadDiagnostics() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/diagnostics`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
        setSystemHealth(data.status);
      }
    } catch { toast.error("Falha ao carregar diagnósticos"); }
  }

  async function loadAnalytics() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/analytics?fresh=true`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data.analytics);
      }
    } catch { toast.error("Falha ao carregar analytics"); }
  }

  async function loadUsersPage(page: number) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/users?page=${page}&per_page=${pagination.perPage}&search=${encodeURIComponent(searchQuery)}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setUsers(d.users || []);
        setPagination(d.pagination || { page, perPage: 50, total: 0, totalPages: 1 });
      }
    } catch { toast.error("Falha ao carregar usuários"); }
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

  const confirmMessages: Record<string, { title: string; message: string }> = {
    block: { title: "Bloquear usuário?", message: "O usuário não poderá mais acessar o sistema." },
    unblock: { title: "Desbloquear usuário?", message: "O usuário voltará a ter acesso ao sistema." },
    reset_data: { title: "Resetar dados do usuário?", message: "Todos os dados serão apagados, mas a conta permanecerá ativa." },
    delete: { title: "DELETAR usuário?", message: "Esta ação é irreversível! A conta e todos os dados serão permanentemente removidos." },
    add_admin: { title: "Tornar administrador?", message: "Este usuário terá acesso total ao painel admin." },
    remove_admin: { title: "Remover privilégios de admin?", message: "Este usuário perderá acesso ao painel admin." },
    change_plan: { title: "Alterar plano?", message: "O plano do usuário será alterado imediatamente." },
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p style={{ color: "var(--text-secondary)" }}>Verificando permissões...</p></div>;
  if (!isAdmin) return <div className="flex items-center justify-center h-64"><p style={{ color: "var(--danger)" }}>Acesso restrito a administradores</p></div>;

  const tabs = [
    { key: "overview" as const, label: "Visão Geral", icon: TrendingUp },
    { key: "analytics" as const, label: "Analytics", icon: PieChart },
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "diagnostics" as const, label: "Diagnóstico", icon: Activity },
    { key: "audit" as const, label: "Auditoria", icon: FileText },
    { key: "plans" as const, label: "Planos", icon: Crown },
  ];

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-white flex items-center gap-2">
              <Shield size={24} style={{ color: "var(--gold)" }} /> Painel Admin
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Gerenciamento e monitoramento do sistema</p>
          </div>
          <HealthBadge status={systemHealth} />
        </div>
        <button onClick={loadData} disabled={refreshing} className="btn-ghost text-sm flex items-center gap-2">
          <RefreshCw size={14} className={clsx(refreshing && "animate-spin")} /> Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto glass" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === "diagnostics") loadDiagnostics(); if (t.key === "analytics") loadAnalytics(); }}
            role="tab"
            id={`admin-tab-${t.key}`}
            aria-controls={`admin-panel-${t.key}`}
            aria-selected={tab === t.key}
            tabIndex={tab === t.key ? 0 : -1}
            className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 min-w-0 whitespace-nowrap px-2")}
            style={{ background: tab === t.key ? "rgba(255,255,255,0.06)" : "transparent", color: tab === t.key ? "var(--text-primary)" : "var(--text-secondary)" }} >
            <t.icon size={14} /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && stats && (
        <div role="tabpanel" id="admin-panel-overview" aria-labelledby="admin-tab-overview" className="space-y-4 stagger-children">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AdminStat icon={<Users size={18} style={{ color: "var(--gold)" }} />} label="Total Usuários" value={stats.users.total} sub={`+${stats.users.newThisWeek} esta semana`} cardClass="card-gold" />
            <AdminStat icon={<UserCheck size={18} style={{ color: "var(--success)" }} />} label="Ativos Hoje" value={stats.users.activeToday} sub={`${stats.users.engagementRate}% engajamento`} cardClass="card-teal" />
            <AdminStat icon={<TrendingUp size={18} style={{ color: "var(--accent-purple)" }} />} label="Novos Semana" value={stats.users.newThisWeek} sub={`${stats.users.weeklyRetention}% retenção`} cardClass="card-purple" />
            <AdminStat icon={<AlertTriangle size={18} style={{ color: "var(--warning)" }} />} label="Bloqueados" value={stats.users.blocked} sub={stats.users.newThisMonth > 0 ? `+${stats.users.newThisMonth} este mês` : ""} cardClass="card-orange" />
          </div>

          {/* Today vs Week */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AdminStat icon={<BookOpen size={18} style={{ color: "var(--gold)" }} />} label="Páginas Hoje" value={stats.metrics.today.pages} sub={`${stats.metrics.week.pages} na semana`} cardClass="card-gold" />
            <AdminStat icon={<BookMarked size={18} style={{ color: "var(--accent-purple)" }} />} label="Capítulos Hoje" value={stats.metrics.today.chapters} sub={`${stats.metrics.week.chapters} na semana`} cardClass="card-purple" />
            <AdminStat icon={<Timer size={18} style={{ color: "var(--danger)" }} />} label="Pomodoros Hoje" value={stats.metrics.today.pomodoros} sub={`${stats.metrics.week.pomodoros} na semana`} cardClass="card-red" />
            <AdminStat icon={<Clock size={18} style={{ color: "var(--success)" }} />} label="Min Foco Hoje" value={stats.metrics.today.focusMin} sub={`${stats.metrics.week.focusMin} na semana`} cardClass="card-teal" />
          </div>

          {/* Weekly Trend */}
          {stats.trend && stats.trend.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={16} style={{ color: "var(--gold)" }} /> Tendência Semanal
              </h3>
              <div className="space-y-2">
                {stats.trend.map((d) => (
                  <div key={d.date} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.01)" }}>
                    <span className="text-xs font-mono w-20" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(d.date + "T12:00:00"), "dd/MM", { locale: ptBR })}
                    </span>
                    <div className="flex-1 flex items-center gap-4">
                      <MetricBar label="Pág" value={d.pages} max={Math.max(...stats.trend.map((t) => t.pages), 1)} color="var(--gold)" />
                      <MetricBar label="Cap" value={d.chapters} max={Math.max(...stats.trend.map((t) => t.chapters), 1)} color="var(--accent-purple)" />
                      <MetricBar label="Pom" value={d.pomodoros} max={Math.max(...stats.trend.map((t) => t.pomodoros), 1)} color="var(--danger)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={14} style={{ color: "var(--gold)" }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Livros Cadastrados</span>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-white">{stats.metrics.totalBooks}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Timer size={14} style={{ color: "var(--danger)" }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Sessões Pomodoro</span>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-white">{stats.metrics.totalPomodoroSessions}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Zap size={16} style={{ color: "var(--gold)" }} /> Ações Rápidas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickAction icon={<Activity size={16} />} label="Diagnóstico Completo" onClick={() => { setTab("diagnostics"); loadDiagnostics(); }} />
              <QuickAction icon={<Database size={16} />} label="Verificar DB" onClick={async () => {
                const headers = await getAuthHeaders();
                const res = await fetch("/api/admin/diagnostics", { headers });
                if (res.ok) {
                  const d = await res.json();
                  const dbCheck = d.checks?.find((c: DiagnosticCheck) => c.name.includes("Banco"));
                  toast(dbCheck?.status === "healthy" ? "✅ Banco de dados saudável" : `⚠️ ${dbCheck?.explanation?.substring(0, 80) || "Problema detectado"}`, { duration: 5000 });
                }
              }} />
              <QuickAction icon={<Mail size={16} />} label="Migrar DB" onClick={async () => {
                const headers = await getAuthHeaders();
                const res = await fetch("/api/migrate", { headers });
                const d = await res.json();
                toast[d.ok ? "success" : "error"](d.ok ? "Migrações verificadas" : `Erro: ${d.error}`);
              }} />
              <QuickAction icon={<RefreshCw size={16} />} label="Recarregar" onClick={loadData} />
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div role="tabpanel" id="admin-panel-users" aria-labelledby="admin-tab-users" className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
              <input
                aria-label="Buscar usuários"
                className="input pl-10"
                placeholder="Buscar por email, nome, ID ou plano..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                onKeyDown={(e) => { if (e.key === "Enter") loadUsersPage(1); }}
              />
            </div>
            <button onClick={() => loadUsersPage(1)} className="btn-ghost text-xs">Buscar</button>
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
              {pagination.total} usuário(s)
            </span>
          </div>

          {/* User table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users size={16} style={{ color: "var(--gold)" }} /> Usuários
              </h3>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Página {pagination.page} de {pagination.totalPages}
              </span>
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Usuário</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Cadastro</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Streak</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Livros</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Pomodoros</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Plano</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Status</th>
                    <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                        {searchQuery ? "Nenhum usuário encontrado para esta busca." : "Nenhum usuário cadastrado."}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onClick={() => setSelectedUser(u)}>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              {u.name ? (
                                <span className="text-sm font-medium text-white truncate max-w-[150px]">{u.name}</span>
                              ) : (
                                <span className="text-sm text-white truncate max-w-[150px]">{u.email || u.id.substring(0, 8) + "..."}</span>
                              )}
                              {u.isAdmin && (
                                <span className="badge text-[10px]" style={{ background: "rgba(212,175,55,0.15)", color: "var(--gold)" }}>
                                  <Shield size={8} /> {u.adminRole || "admin"}
                                </span>
                              )}
                            </div>
                            {u.email && u.name && (
                              <span className="text-[11px] truncate max-w-[180px]" style={{ color: "var(--text-secondary)" }}>{u.email}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
                          {u.joinedAt ? format(new Date(u.joinedAt), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="p-3 text-center">
                          {u.streak > 0 ? (
                            <span className="text-xs font-semibold flex items-center justify-center gap-1" style={{ color: "var(--warning)" }}>
                              <Flame size={12} /> {u.streak}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>0</span>
                          )}
                        </td>
                        <td className="p-3 text-center text-xs" style={{ color: "var(--accent-purple)" }}>{u.books}</td>
                        <td className="p-3 text-center text-xs" style={{ color: "var(--danger)" }}>{u.pomodoros}</td>
                        <td className="p-3 text-center">
                          <button onClick={(e) => { e.stopPropagation(); setPlanModal({ userId: u.id, currentPlan: u.plan }); }}
                            className="badge text-[10px] hover:opacity-80 transition-opacity" style={{
                              background: u.plan === "premium" ? "rgba(212,175,55,0.12)" : u.plan === "pro" ? "rgba(124,107,189,0.12)" : "rgba(255,255,255,0.04)",
                              color: u.plan === "premium" ? "var(--gold)" : u.plan === "pro" ? "var(--accent-purple)" : "var(--text-muted)",
                            }}>{u.plan}</button>
                        </td>
                        <td className="p-3 text-center">
                          {u.blocked ? (
                            <span className="badge text-[10px]" style={{ background: "rgba(217,79,79,0.15)", color: "var(--danger)" }}>BLOQUEADO</span>
                          ) : (
                            <span className="badge text-[10px]" style={{ background: "rgba(58,186,180,0.1)", color: "var(--success)" }}>Ativo</span>
                          )}
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {u.blocked ? (
                              <ActionButton icon={<Unlock size={13} />} color="var(--success)" title="Desbloquear" onClick={() => setConfirmAction({ userId: u.id, action: "unblock" })} />
                            ) : (
                              <ActionButton icon={<Ban size={13} />} color="var(--warning)" title="Bloquear" onClick={() => setConfirmAction({ userId: u.id, action: "block" })} />
                            )}
                            {!u.isAdmin ? (
                              <ActionButton icon={<Shield size={13} />} color="var(--gold)" title="Tornar Admin" onClick={() => setConfirmAction({ userId: u.id, action: "add_admin" })} />
                            ) : (
                              <ActionButton icon={<Shield size={13} className="opacity-40" />} color="var(--text-secondary)" title="Remover Admin" onClick={() => setConfirmAction({ userId: u.id, action: "remove_admin" })} />
                            )}
                            <ActionButton icon={<RotateCcw size={13} />} color="var(--accent-purple)" title="Resetar dados" onClick={() => setConfirmAction({ userId: u.id, action: "reset_data" })} />
                            <ActionButton icon={<Trash2 size={13} />} color="var(--danger)" title="Deletar" onClick={() => setConfirmAction({ userId: u.id, action: "delete" })} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
                <button
                  onClick={() => loadUsersPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="btn-ghost text-xs flex items-center gap-1"
                  style={{ opacity: pagination.page <= 1 ? 0.3 : 1 }}
                >
                  <ChevronLeft size={14} /> Anterior
                </button>
                <span className="text-xs px-3" style={{ color: "var(--text-muted)" }}>
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => loadUsersPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn-ghost text-xs flex items-center gap-1"
                  style={{ opacity: pagination.page >= pagination.totalPages ? 0.3 : 1 }}
                >
                  Próximo <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diagnostics */}
      {tab === "diagnostics" && (
        <div role="tabpanel" id="admin-panel-diagnostics" aria-labelledby="admin-tab-diagnostics" className="space-y-4">
          {/* Summary Header */}
          {diagnostics && (
            <div className={clsx("card", diagnostics.status === "healthy" ? "card-teal" : diagnostics.status === "warning" ? "card-orange" : "card-red")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {diagnostics.status === "healthy" ? (
                    <CheckCircle size={24} style={{ color: "var(--success)" }} />
                  ) : diagnostics.status === "warning" ? (
                    <AlertTriangle size={24} style={{ color: "var(--warning)" }} />
                  ) : (
                    <XCircle size={24} style={{ color: "var(--danger)" }} />
                  )}
                  <div>
                    <h3 className="font-semibold text-white">
                      {diagnostics.status === "healthy" ? "Sistema Saudável" : diagnostics.status === "warning" ? "Atenção Necessária" : "Problemas Críticos"}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {diagnostics.summary.healthy} saudáveis · {diagnostics.summary.warnings} avisos · {diagnostics.summary.errors} erros · {diagnostics.summary.disabled} desativados
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Última verificação</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {format(new Date(diagnostics.timestamp), "dd/MM/yyyy HH:mm:ss")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Issues List */}
          {diagnostics && diagnostics.issues.length > 0 && (
            <div className="card" style={{ borderColor: "rgba(217,79,79,0.2)" }}>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle size={16} style={{ color: "var(--danger)" }} /> Problemas Detectados ({diagnostics.issues.length})
              </h3>
              <div className="space-y-2">
                {diagnostics.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "rgba(217,79,79,0.05)" }}>
                    <XCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--danger)" }} />
                    <span className="text-sm" style={{ color: "var(--danger)" }}>{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Checks */}
          {diagnostics ? (
            <div className="space-y-3">
              {diagnostics.checks.map((check) => (
                <DiagnosticCard
                  key={check.name}
                  check={check}
                  expanded={expandedDiagnostic === check.name}
                  onToggle={() => setExpandedDiagnostic(expandedDiagnostic === check.name ? null : check.name)}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <Activity size={32} className="mx-auto mb-3" style={{ color: "var(--text-secondary)" }} />
              <p style={{ color: "var(--text-secondary)" }}>Clique em &quot;Diagnóstico Completo&quot; ou aguarde o carregamento</p>
              <button onClick={loadDiagnostics} className="btn-primary mt-4 text-sm">Executar Diagnóstico</button>
            </div>
          )}
        </div>
      )}

      {/* Audit */}
      {tab === "audit" && (
        <div role="tabpanel" id="admin-panel-audit" aria-labelledby="admin-tab-audit" className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FileText size={16} style={{ color: "var(--gold)" }} /> Logs de Auditoria ({auditLogs.length})
              </h3>
              <select
                aria-label="Filtrar ações de auditoria"
                className="input text-xs w-auto"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                style={{ maxWidth: 180 }}
              >
                <option value="">Todas as ações</option>
                <option value="user_blocked">Bloqueio</option>
                <option value="user_unblocked">Desbloqueio</option>
                <option value="admin_added">Admin adicionado</option>
                <option value="admin_removed">Admin removido</option>
                <option value="plan_changed">Plano alterado</option>
                <option value="user_data_reset">Dados resetados</option>
                <option value="user_deleted">Usuário deletado</option>
              </select>
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Data</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Ator</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Ação</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Alvo</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                        Nenhum log de auditoria encontrado.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{format(new Date(log.created_at), "dd/MM HH:mm")}</td>
                        <td className="p-3 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>{log.actor_id?.substring(0, 8) || "system"}</td>
                        <td className="p-3">
                          <span className="badge text-[10px]" style={{
                            background: log.action.includes("block") || log.action.includes("delete") ? "rgba(217,79,79,0.1)" : log.action.includes("admin") ? "rgba(212,175,55,0.1)" : "rgba(58,186,180,0.1)",
                            color: log.action.includes("block") || log.action.includes("delete") ? "var(--danger)" : log.action.includes("admin") ? "var(--gold)" : "var(--success)",
                          }}>{log.action}</span>
                        </td>
                        <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
                          {log.target_type || "—"}{log.target_id ? ` ${log.target_id.substring(0, 8)}...` : ""}
                        </td>
                        <td className="p-3 text-xs max-w-[200px] truncate" style={{ color: "var(--text-secondary)" }}>
                          {log.details ? JSON.stringify(log.details).substring(0, 80) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      {tab === "plans" && stats && (
        <div role="tabpanel" id="admin-panel-plans" aria-labelledby="admin-tab-plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { plan: "free", label: "Free", color: "var(--text-muted)", count: stats.plans.free, features: ["5 livros", "8 pomodoros/dia", "3 mensagens IA/dia", "1 som pomodoro"] },
              { plan: "pro", label: "Pro", color: "var(--accent-purple)", count: stats.plans.pro, features: ["20 livros", "Pomodoros ilimitados", "IA ilimitada", "3 sons pomodoro"] },
              { plan: "premium", label: "Premium", color: "var(--gold)", count: stats.plans.premium, features: ["Livros ilimitados", "Tudo ilimitado", "Suporte prioritário", "Todos os sons"] },
            ].map((p) => (
              <div key={p.plan} className="card text-center relative overflow-hidden">
                {p.plan === "premium" && (
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${p.color}66, ${p.color})` }} />
                )}
                <Crown size={24} className="mx-auto mb-2" style={{ color: p.color }} />
                <h3 className="font-semibold text-white text-lg">{p.label}</h3>
                <p className="text-3xl font-semibold tracking-tight mt-2" style={{ color: p.color }}>{p.count}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>usuários ativos</p>
                <div className="mt-3 space-y-1">
                  {p.features.map((f) => (
                    <p key={f} className="text-[11px] flex items-center justify-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <CheckCircle2 size={10} style={{ color: p.color }} /> {f}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Plan distribution bar */}
          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart3 size={16} style={{ color: "var(--gold)" }} /> Distribuição de Planos
            </h3>
            <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "var(--border)" }}>
              {stats.plans.free > 0 && (
                <div style={{ width: `${(stats.plans.free / (stats.plans.free + stats.plans.pro + stats.plans.premium)) * 100}%`, background: "var(--text-muted)" }} className="transition-all duration-700" />
              )}
              {stats.plans.pro > 0 && (
                <div style={{ width: `${(stats.plans.pro / (stats.plans.free + stats.plans.pro + stats.plans.premium)) * 100}%`, background: "var(--accent-purple)" }} className="transition-all duration-700" />
              )}
              {stats.plans.premium > 0 && (
                <div style={{ width: `${(stats.plans.premium / (stats.plans.free + stats.plans.pro + stats.plans.premium)) * 100}%`, background: "var(--gold)" }} className="transition-all duration-700" />
              )}
            </div>
            <div className="flex items-center justify-center gap-6 mt-3">
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}><span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--text-muted)" }} /> Free</span>
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--accent-purple)" }}><span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--accent-purple)" }} /> Pro</span>
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--gold)" }}><span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--gold)" }} /> Premium</span>
            </div>
          </div>
        </div>
      )}

      {/* Analytics */}
      {tab === "analytics" && (
        <div role="tabpanel" id="admin-panel-analytics" aria-labelledby="admin-tab-analytics" className="space-y-4 stagger-children">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <PieChart size={16} style={{ color: "var(--gold)" }} /> Analytics de Produto
            </h3>
            <button onClick={loadAnalytics} className="btn-ghost text-xs flex items-center gap-2">
              <RefreshCw size={12} /> Atualizar
            </button>
          </div>

          {analyticsData ? (
            <>
              {/* Active Users */}
              <div className="card">
                <h4 className="text-xs uppercase tracking-wider font-medium mb-4 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                  <Users size={12} /> Usuários Ativos
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <AnalyticsMetric icon={<Users size={14} style={{ color: "var(--gold)" }} />} label="DAU" value={analyticsData.daily_active_users} sub="hoje" />
                  <AnalyticsMetric icon={<CalendarDays size={14} style={{ color: "var(--accent-purple)" }} />} label="WAU" value={analyticsData.weekly_active_users} sub="semana" />
                  <AnalyticsMetric icon={<Layers size={14} style={{ color: "var(--success)" }} />} label="MAU" value={analyticsData.monthly_active_users} sub="mês" />
                  <AnalyticsMetric icon={<Flame size={14} style={{ color: "var(--warning)" }} />} label="Streak Ativos" value={analyticsData.active_streak_users} sub="streak ≥3" />
                </div>
              </div>

              {/* Retention & Growth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="card">
                  <h4 className="text-xs uppercase tracking-wider font-medium mb-4 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <Percent size={12} /> Retenção
                  </h4>
                  <div className="space-y-3">
                    <RetentionBar label="7 dias" value={analyticsData.retention_7d} />
                    <RetentionBar label="30 dias" value={analyticsData.retention_30d} />
                  </div>
                </div>
                <div className="card">
                  <h4 className="text-xs uppercase tracking-wider font-medium mb-4 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <UserPlus size={12} /> Crescimento
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <AnalyticsMetric icon={<ArrowUpRight size={14} style={{ color: "var(--success)" }} />} label="Novos Hoje" value={analyticsData.new_users_today} />
                    <AnalyticsMetric icon={<TrendingUp size={14} style={{ color: "var(--accent-purple)" }} />} label="Novos Semana" value={analyticsData.new_users_this_week} />
                  </div>
                  <div className="mt-3 p-3 rounded-xl glass">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Total de Usuários</span>
                      <span className="text-lg font-semibold tracking-tight text-white">{analyticsData.total_users}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (analyticsData.weekly_active_users / Math.max(analyticsData.total_users, 1)) * 100)}%`, background: "linear-gradient(90deg, var(--accent-purple), var(--gold))" }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Engajamento semanal</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{analyticsData.total_users > 0 ? Math.round((analyticsData.weekly_active_users / analyticsData.total_users) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Averages */}
              <div className="card">
                <h4 className="text-xs uppercase tracking-wider font-medium mb-4 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                  <BarChart3 size={12} /> Médias Diárias
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <AnalyticsMetric icon={<Flame size={14} style={{ color: "var(--warning)" }} />} label="Streak Médio" value={analyticsData.average_streak} sub="dias" />
                  <AnalyticsMetric icon={<BookOpen size={14} style={{ color: "var(--accent-purple)" }} />} label="Páginas/Dia" value={analyticsData.average_daily_pages} />
                  <AnalyticsMetric icon={<Timer size={14} style={{ color: "var(--danger)" }} />} label="Pomodoros/Dia" value={analyticsData.average_daily_pomodoros} />
                </div>
              </div>

              {/* Notifications */}
              <div className="card">
                <h4 className="text-xs uppercase tracking-wider font-medium mb-4 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                  <Bell size={12} /> Notificações
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <AnalyticsMetric icon={<Bell size={14} style={{ color: "var(--success)" }} />} label="Enviadas" value={analyticsData.notifications_sent} />
                  <AnalyticsMetric icon={<CheckCircle size={14} style={{ color: "var(--gold)" }} />} label="Entregues" value={analyticsData.notifications_delivered} />
                  <AnalyticsMetric icon={<AlertTriangle size={14} style={{ color: "var(--danger)" }} />} label="Falharam" value={analyticsData.notifications_failed} />
                </div>
                {analyticsData.notifications_sent > 0 && (
                  <div className="mt-3 p-3 rounded-xl glass">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Taxa de entrega</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                        {Math.round((analyticsData.notifications_delivered / analyticsData.notifications_sent) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(analyticsData.notifications_delivered / analyticsData.notifications_sent) * 100}%`, background: "var(--success)" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Last updated */}
              <div className="text-center">
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  Última atualização: {analyticsData.captured_at ? format(new Date(analyticsData.captured_at), "dd/MM/yyyy HH:mm:ss") : "—"}
                </p>
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <PieChart size={40} className="mx-auto mb-4" style={{ color: "var(--text-secondary)" }} />
              <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>Carregando analytics de produto...</p>
              <button onClick={loadAnalytics} className="btn-primary text-sm mt-2">Carregar Analytics</button>
            </div>
          )}
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="admin-user-detail-title"
            style={{ background: "var(--surface)", border: "1px solid var(--border-light)" }}>
            <div className="flex items-center justify-between">
              <h3 id="admin-user-detail-title" className="font-semibold text-white flex items-center gap-2">
                <Eye size={16} style={{ color: "var(--gold)" }} /> Detalhes do Usuário
              </h3>
              <button onClick={() => setSelectedUser(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/5" style={{ color: "var(--text-secondary)" }} aria-label="Fechar">✕</button>
            </div>

            {/* User Identity */}
            <div className="p-4 rounded-xl space-y-2 glass">
              {selectedUser.name && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold text-white">{selectedUser.name}</span>
                  {selectedUser.isAdmin && (
                    <span className="badge text-[10px]" style={{ background: "rgba(212,175,55,0.15)", color: "var(--gold)" }}>
                      <Shield size={8} /> Admin
                    </span>
                  )}
                </div>
              )}
              {selectedUser.email && (
                <div className="flex items-center gap-2">
                  <Mail size={12} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{selectedUser.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-1 rounded" style={{ background: "var(--border)", color: "var(--text-secondary)" }}>
                  {selectedUser.id}
                </span>
                <button onClick={() => { navigator.clipboard.writeText(selectedUser.id); toast.success("ID copiado!"); }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-white/5" style={{ color: "var(--text-secondary)" }} aria-label="Copiar ID do usuário"><Copy size={12} /></button>
              </div>
            </div>

            {/* User Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon={<CalendarDays size={12} style={{ color: "var(--text-muted)" }} />} label="Cadastro" value={selectedUser.joinedAt ? format(new Date(selectedUser.joinedAt), "dd/MM/yyyy") : "—"} />
              <MiniStat icon={<Clock size={12} style={{ color: "var(--success)" }} />} label="Último acesso" value={selectedUser.lastActive || "—"} />
              <MiniStat icon={<Crown size={12} style={{ color: "var(--gold)" }} />} label="Plano" value={selectedUser.plan} />
              <MiniStat icon={<Flame size={12} style={{ color: "var(--warning)" }} />} label="Streak" value={`${selectedUser.streak} dias`} />
              <MiniStat icon={<BookOpen size={12} style={{ color: "var(--accent-purple)" }} />} label="Livros" value={`${selectedUser.books}`} />
              <MiniStat icon={<Timer size={12} style={{ color: "var(--danger)" }} />} label="Pomodoros" value={`${selectedUser.pomodoros}`} />
              <MiniStat icon={<BookOpen size={12} style={{ color: "var(--gold)" }} />} label="Páginas lidas" value={`${selectedUser.totalPages}`} />
              <MiniStat icon={<BookMarked size={12} style={{ color: "var(--accent-purple)" }} />} label="Cap. bíblia" value={`${selectedUser.totalChapters}`} />
              <MiniStat icon={<Clock size={12} style={{ color: "var(--success)" }} />} label="Min. foco" value={`${selectedUser.totalFocusMin}`} />
              <MiniStat icon={selectedUser.blocked ? <UserX size={12} style={{ color: "var(--danger)" }} /> : <UserCheck size={12} style={{ color: "var(--success)" }} />} label="Status" value={selectedUser.blocked ? "Bloqueado" : "Ativo"} />
            </div>

            {selectedUser.blocked && selectedUser.blockedReason && (
              <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(217,79,79,0.05)", border: "1px solid rgba(217,79,79,0.1)" }}>
                <span style={{ color: "var(--danger)" }}>Motivo do bloqueio: </span>
                <span style={{ color: "var(--text-muted)" }}>{selectedUser.blockedReason}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: "1px solid var(--border-light)" }}>
              {!selectedUser.isAdmin && (
                <button onClick={() => { setConfirmAction({ userId: selectedUser.id, action: "add_admin" }); setSelectedUser(null); }}
                  className="btn-ghost text-xs flex items-center gap-1" style={{ color: "var(--gold)" }}>
                  <Shield size={12} /> Tornar Admin
                </button>
              )}
              {selectedUser.isAdmin && (
                <button onClick={() => { setConfirmAction({ userId: selectedUser.id, action: "remove_admin" }); setSelectedUser(null); }}
                  className="btn-ghost text-xs flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                  <Shield size={12} /> Remover Admin
                </button>
              )}
              <button onClick={() => { setPlanModal({ userId: selectedUser.id, currentPlan: selectedUser.plan }); setSelectedUser(null); }}
                className="btn-ghost text-xs flex items-center gap-1" style={{ color: "var(--accent-purple)" }}>
                <Crown size={12} /> Alterar Plano
              </button>
              {selectedUser.blocked ? (
                <button onClick={() => { setConfirmAction({ userId: selectedUser.id, action: "unblock" }); setSelectedUser(null); }}
                  className="btn-ghost text-xs flex items-center gap-1" style={{ color: "var(--success)" }}>
                  <Unlock size={12} /> Desbloquear
                </button>
              ) : (
                <button onClick={() => { setConfirmAction({ userId: selectedUser.id, action: "block" }); setSelectedUser(null); }}
                  className="btn-ghost text-xs flex items-center gap-1" style={{ color: "var(--warning)" }}>
                  <Ban size={12} /> Bloquear
                </button>
              )}
              <button onClick={() => { setConfirmAction({ userId: selectedUser.id, action: "reset_data" }); setSelectedUser(null); }}
                className="btn-ghost text-xs flex items-center gap-1" style={{ color: "var(--accent-purple)" }}>
                <RotateCcw size={12} /> Resetar Dados
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
            role="dialog" aria-modal="true" aria-labelledby="admin-plan-change-title"
            style={{ background: "var(--surface)", border: "1px solid var(--border-light)" }}>
            <h3 id="admin-plan-change-title" className="font-semibold text-white">Alterar Plano</h3>
            <div className="grid grid-cols-3 gap-2">
              {(["free", "pro", "premium"] as const).map((plan) => (
                <button key={plan} onClick={() => { manageUser(planModal.userId, "change_plan", { new_plan: plan }); setPlanModal(null); }}
                  className={clsx("p-3 rounded-xl text-center transition-all duration-200")}
                  style={{
                    background: planModal.currentPlan === plan ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)",
                    border: planModal.currentPlan === plan ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(255,255,255,0.05)",
                    color: planModal.currentPlan === plan ? "var(--gold)" : "var(--text-muted)",
                  }}>
                  <p className="text-sm font-semibold capitalize">{plan}</p>
                  {planModal.currentPlan === plan && <p className="text-[10px] mt-0.5">(atual)</p>}
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

// ── Sub Components ─────────────────────────────────────────────

function HealthBadge({ status }: { status: "healthy" | "warning" | "error" | "loading" }) {
  const config = {
    healthy: { color: "var(--success)", bg: "rgba(58,186,180,0.1)", text: "Saudável", icon: <Wifi size={12} /> },
    warning: { color: "var(--warning)", bg: "rgba(232,132,74,0.1)", text: "Atenção", icon: <AlertTriangle size={12} /> },
    error: { color: "var(--danger)", bg: "rgba(217,79,79,0.1)", text: "Problemas", icon: <WifiOff size={12} /> },
    loading: { color: "var(--text-secondary)", bg: "var(--border)", text: "Verificando", icon: <RefreshCw size={12} className="animate-spin" /> },
  }[status];

  return (
    <span className="badge text-[10px] flex items-center gap-1.5" style={{ background: config.bg, color: config.color }}>
      {config.icon} {config.text}
    </span>
  );
}

function AdminStat({ icon, label, value, sub, cardClass }: { icon: React.ReactNode; label: string; value: number; sub?: string; cardClass: string }) {
  return (
    <div className={clsx("stat-card", cardClass)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
        {icon}
      </div>
      <p className="text-xl font-semibold tracking-tight text-white count-up">{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <span className="text-[10px] w-8 text-right" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] w-6 text-right" style={{ color: "var(--text-muted)" }}>{value}</span>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105 glass"
      style={{ color: "var(--text-muted)" }}>
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-xl flex items-center gap-2 glass">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</p>
        <p className="text-xs text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ icon, color, title, onClick }: { icon: React.ReactNode; color: string; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" style={{ color }} title={title} aria-label={title}>
      {icon}
    </button>
  );
}

function DiagnosticCard({ check, expanded, onToggle }: { check: DiagnosticCheck; expanded: boolean; onToggle: () => void }) {
  const statusConfig = {
    healthy: { icon: <CheckCircle size={18} />, color: "var(--success)", bg: "rgba(58,186,180,0.06)", border: "rgba(58,186,180,0.12)", label: "Saudável" },
    warning: { icon: <AlertTriangle size={18} />, color: "var(--warning)", bg: "rgba(232,132,74,0.06)", border: "rgba(232,132,74,0.12)", label: "Atenção" },
    error: { icon: <XCircle size={18} />, color: "var(--danger)", bg: "rgba(217,79,79,0.06)", border: "rgba(217,79,79,0.12)", label: "Erro" },
    disabled: { icon: <Info size={18} />, color: "var(--text-secondary)", bg: "var(--surface)", border: "var(--border-light)", label: "Desativado" },
  }[check.status];

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{ background: statusConfig.bg, border: `1px solid ${statusConfig.border}` }}>
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-3 text-left">
        <span style={{ color: statusConfig.color }}>{statusConfig.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{check.name}</span>
            <span className="badge text-[10px]" style={{ background: statusConfig.bg, color: statusConfig.color, border: `1px solid ${statusConfig.border}` }}>
              {statusConfig.label}
            </span>
            {check.latency_ms !== undefined && (
              <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{check.latency_ms}ms</span>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{check.description}</p>
        </div>
        <ChevronDown size={16} className={clsx("transition-transform duration-200 flex-shrink-0", expanded && "rotate-180")} style={{ color: "var(--text-secondary)" }} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-slide-up">
          {/* Explanation */}
          <div className="p-3 rounded-xl glass">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Info size={12} style={{ color: statusConfig.color }} />
              <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-secondary)" }}>O que isso significa</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{check.explanation}</p>
          </div>

          {/* Suggestion */}
          <div className="p-3 rounded-xl glass">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Settings size={12} style={{ color: "var(--gold)" }} />
              <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-secondary)" }}>Como resolver</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{check.suggestion}</p>
          </div>

          {/* Details (raw) */}
          {check.details && Object.keys(check.details).length > 0 && (
            <div className="p-3 rounded-xl glass">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Database size={12} style={{ color: "var(--accent-purple)" }} />
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-secondary)" }}>Detalhes técnicos</span>
              </div>
              <pre className="text-[10px] font-mono whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {JSON.stringify(check.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnalyticsMetric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="p-3 rounded-xl glass">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</span>
      </div>
      <p className="text-xl font-semibold tracking-tight text-white">{typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

function RetentionBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="text-sm font-semibold" style={{ color: value >= 40 ? "var(--success)" : value >= 20 ? "var(--warning)" : "var(--danger)" }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{
          width: `${value}%`,
          background: value >= 40 ? "var(--success)" : value >= 20 ? "var(--warning)" : "var(--danger)",
        }} />
      </div>
    </div>
  );
}
