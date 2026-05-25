"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  Users, Activity, Shield, CheckCircle2, XCircle, Clock,
  BookOpen, BookMarked, Timer, TrendingUp, Zap, FlameKindling, Crown
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";

interface Stats {
  users: { total: number; activeToday: number; newThisWeek: number };
  metrics: { pagesToday: number; chaptersToday: number; pomodorosToday: number };
  plans: { free: number; pro: number; premium: number };
}

interface UserRow {
  id: string; joinedAt: string; lastActive: string | null;
  books: number; pomodoros: number; plan: string;
}

interface DiagService { ok: boolean; detail?: string }

interface Diagnostics { services: Record<string, DiagService>; timestamp: string }

export default function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [tab, setTab] = useState<"overview" | "users" | "diag" | "plans">("overview");

  useEffect(() => {
    checkAdmin();
  }, [user]);

  async function checkAdmin() {
    if (!user || !supabase) return;
    const { data } = await supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
    if (data) {
      setIsAdmin(true);
      loadData();
    }
    setLoading(false);
  }

  async function loadData() {
    const secret = process.env.NEXT_PUBLIC_CRON_SECRET || "";
    const headers: Record<string, string> = {};
    // Use service role for admin APIs
    try {
      const [statsRes, usersRes, diagRes] = await Promise.all([
        fetch(`/api/admin/stats?secret=${secret}`),
        fetch(`/api/admin/users?secret=${secret}`),
        fetch(`/api/admin/diagnostics?secret=${secret}`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) { const d = await usersRes.json(); setUsers(d.users || []); }
      if (diagRes.ok) setDiag(await diagRes.json());
    } catch (e) { /* silently fail */ }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p style={{ color: "#555E6E" }}>Verificando permissões...</p></div>;
  }

  if (!isAdmin) {
    return <div className="flex items-center justify-center h-64"><p style={{ color: "#D94F4F" }}>Acesso restrito a administradores</p></div>;
  }

  const tabs = [
    { key: "overview" as const, label: "Visão Geral", icon: TrendingUp },
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "diag" as const, label: "Diagnóstico", icon: Shield },
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
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2")}
            style={{
              background: tab === t.key ? "rgba(255,255,255,0.06)" : "transparent",
              color: tab === t.key ? "#F0F0F0" : "#555E6E",
            }}>
            <t.icon size={14} /> {t.label}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>ID</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Cadastro</th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Último Acesso</th>
                  <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Livros</th>
                  <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Pomodoros</th>
                  <th className="text-center p-3 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Plano</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td className="p-3 font-mono text-xs" style={{ color: "#8B95A5" }}>{u.id.substring(0, 8)}...</td>
                    <td className="p-3 text-xs" style={{ color: "#8B95A5" }}>{u.joinedAt ? format(new Date(u.joinedAt), "dd/MM/yyyy") : "—"}</td>
                    <td className="p-3 text-xs" style={{ color: "#8B95A5" }}>{u.lastActive || "—"}</td>
                    <td className="p-3 text-center text-xs" style={{ color: "#7C6BBD" }}>{u.books}</td>
                    <td className="p-3 text-center text-xs" style={{ color: "#D94F4F" }}>{u.pomodoros}</td>
                    <td className="p-3 text-center">
                      <span className="badge text-[10px]" style={{
                        background: u.plan === "premium" ? "rgba(212,175,55,0.12)" : u.plan === "pro" ? "rgba(124,107,189,0.12)" : "rgba(255,255,255,0.04)",
                        color: u.plan === "premium" ? "#D4AF37" : u.plan === "pro" ? "#7C6BBD" : "#8B95A5",
                      }}>
                        {u.plan}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Diagnostics */}
      {tab === "diag" && diag && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Shield size={16} style={{ color: "#D4AF37" }} /> Status dos Serviços
          </h3>
          <div className="space-y-3">
            {Object.entries(diag.services).map(([name, svc]) => (
              <div key={name} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3">
                  {svc.ok ? <CheckCircle2 size={18} style={{ color: "#3ABAB4" }} /> : <XCircle size={18} style={{ color: "#D94F4F" }} />}
                  <span className="text-sm font-medium text-white capitalize">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#555E6E" }}>{svc.detail?.substring(0, 40) || ""}</span>
                  <span className="badge text-[10px]" style={{
                    background: svc.ok ? "rgba(58,186,180,0.12)" : "rgba(217,79,79,0.12)",
                    color: svc.ok ? "#3ABAB4" : "#D94F4F",
                  }}>{svc.ok ? "UP" : "DOWN"}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-4" style={{ color: "#555E6E" }}>Última verificação: {diag.timestamp ? format(new Date(diag.timestamp), "dd/MM HH:mm") : "—"}</p>
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
          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Crown size={16} style={{ color: "#D4AF37" }} /> Limites por Plano
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <th className="text-left p-2 text-[10px] uppercase tracking-wider" style={{ color: "#555E6E" }}>Feature</th>
                    <th className="text-center p-2 text-[10px] uppercase tracking-wider" style={{ color: "#8B95A5" }}>Free</th>
                    <th className="text-center p-2 text-[10px] uppercase tracking-wider" style={{ color: "#7C6BBD" }}>Pro</th>
                    <th className="text-center p-2 text-[10px] uppercase tracking-wider" style={{ color: "#D4AF37" }}>Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Livros ativos", "3", "10", "∞"],
                    ["Pomodoro/dia", "5", "∞", "∞"],
                    ["Relatório semanal", "❌", "✅", "✅"],
                    ["Sons ambiente", "1", "Todos", "Todos"],
                    ["AI motivação/dia", "3", "∞", "∞"],
                    ["Streak freeze/mês", "1", "3", "∞"],
                  ].map(([feat, free, pro, prem], i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td className="p-2 text-xs" style={{ color: "#8B95A5" }}>{feat}</td>
                      <td className="p-2 text-center text-xs" style={{ color: "#8B95A5" }}>{free}</td>
                      <td className="p-2 text-center text-xs" style={{ color: "#7C6BBD" }}>{pro}</td>
                      <td className="p-2 text-center text-xs" style={{ color: "#D4AF37" }}>{prem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
