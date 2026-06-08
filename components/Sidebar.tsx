"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Timer, Settings,
  Menu, X, Flame, FlameKindling, ChevronRight, BookMarked, LogOut, Shield, Crown, Users, BarChart3, Rss
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { dataFetch } from "@/lib/data-fetch";
import { clsx } from "clsx";
import { Download } from "lucide-react";
import { toast } from "react-hot-toast";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", color: "text-[var(--gold)]" },
  { href: "/livros", icon: BookOpen, label: "Livros", color: "text-[var(--accent-purple)]" },
  { href: "/biblia", icon: BookMarked, label: "Bíblia", color: "text-[var(--gold)]" },
  { href: "/pomodoro", icon: Timer, label: "Pomodoro", color: "text-[var(--accent-red)]" },
  { href: "/feed", icon: Rss, label: "Feed", color: "text-[var(--accent-teal)]" },
  { href: "/ranking", icon: BarChart3, label: "Ranking", color: "text-[var(--gold)]" },
  { href: "/grupos", icon: Users, label: "Grupos", color: "text-[var(--accent-teal)]" },
  { href: "/planos", icon: Crown, label: "Planos", color: "text-[var(--gold)]" },
  { href: "/configuracoes", icon: Settings, label: "Configurações", color: "text-[var(--text-muted)]" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { streak, pomodoroActive, sidebarOpen, setSidebarOpen, pwaInstallPrompt, setPwaInstallPrompt } = useStore();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      dataFetch({ action: "select", table: "admin_users", filters: { eq: { user_id: user.id }, maybeSingle: true, select: "role" } })
        .then(({ data }) => setIsAdmin(!!data));
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile toggle — positioned below status bar with safe area */}
      <button
        className="fixed z-50 md:hidden glass p-2.5 rounded-xl hover:bg-white/5 transition-all duration-300"
        style={{
          top: "max(16px, env(safe-area-inset-top, 16px))",
          left: "max(16px, env(safe-area-inset-left, 16px))",
        }}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={18} className="text-slate-300" /> : <Menu size={18} className="text-slate-400" />}
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed md:relative z-40 h-full transition-all duration-300 ease-out",
          "flex flex-col border-r overflow-y-auto overscroll-contain",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          sidebarOpen ? "w-64" : "w-16"
        )}
        style={{
          background: "var(--bg-sidebar)",
          borderColor: "var(--border)",
          WebkitOverflowScrolling: "touch",
          // Safe area for iOS
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
        }}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
                  boxShadow: "0 0 30px var(--gold-glow), 0 0 60px rgba(212,175,55,0.1)",
                }}
              >
                <FlameKindling size={18} style={{ color: "var(--bg-primary)" }} />
              </div>
              <div>
                <span className="font-serif font-bold text-white text-sm tracking-tight">DisciplinaMax</span>
                <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--text-secondary)" }}>Mentor de Disciplina</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex glass p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-auto"
            style={{ color: "var(--text-secondary)" }}
            aria-label={sidebarOpen ? "Recolher sidebar" : "Expandir sidebar"}
          >
            <ChevronRight size={14} className={clsx("transition-transform duration-300", !sidebarOpen && "rotate-180")} />
          </button>
        </div>

        {/* Streak */}
        {sidebarOpen && streak > 0 && (
          <div className="card-orange mx-3 mt-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <Flame size={18} style={{ color: "var(--warning)" }} />
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--warning)" }}>{streak} dias seguidos!</p>
                <p className="text-[10px]" style={{ color: "rgba(232,132,74,0.4)" }}>Continue assim 🔥</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav — grows to fill space, items spread evenly */}
        <nav className="flex-1 p-3 space-y-0.5 flex flex-col justify-center" style={{ minHeight: 0 }}>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={clsx(
                    "nav-item",
                    active && "active",
                    !sidebarOpen && "justify-center px-2"
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                  aria-label={!sidebarOpen ? item.label : undefined}
                >
                  <item.icon size={18} className={clsx("transition-colors duration-300", active ? item.color : "text-[var(--text-secondary)]")} />
                  {sidebarOpen && <span className={clsx(active && "text-white font-medium")}>{item.label}</span>}
                  {sidebarOpen && active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold)", boxShadow: "0 0 8px rgba(212,175,55,0.4)" }} />
                  )}
                  {sidebarOpen && pomodoroActive && item.href === "/pomodoro" && (
                    <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={closeMobile}
                className={clsx("nav-item", pathname === "/admin" && "active", !sidebarOpen && "justify-center px-2")}
                title={!sidebarOpen ? "Admin" : undefined}
                aria-label={!sidebarOpen ? "Admin" : undefined}
              >
                <Shield size={18} className={clsx("transition-colors duration-300", pathname === "/admin" ? "text-[var(--gold)]" : "text-[var(--text-secondary)]")} />
                {sidebarOpen && <span className={clsx(pathname === "/admin" && "text-white font-medium")}>Admin</span>}
                {sidebarOpen && pathname === "/admin" && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold)", boxShadow: "0 0 8px rgba(212,175,55,0.4)" }} />
                )}
              </Link>
            )}
          </div>
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--border)", paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}>
            {user && (
              <div className="glass rounded-xl p-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))", color: "var(--bg-primary)" }}>
                    {(user.user_metadata?.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{user.user_metadata?.name || "Usuário"}</p>
                    <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{user.email}</p>
                  </div>
                </div>
              </div>
            )}
            <button onClick={signOut} className="nav-item w-full justify-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <LogOut size={14} /> Sair
            </button>
            {pwaInstallPrompt && sidebarOpen && (
              <button
                onClick={async () => {
                  try {
                    pwaInstallPrompt.prompt();
                    const { outcome } = await pwaInstallPrompt.userChoice;
                    if (outcome === "accepted") toast.success("App instalado! 🎉");
                    setPwaInstallPrompt(null);
                  } catch { /* ignore */ }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 mt-2"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)", color: "var(--gold)" }}
              >
                <Download size={14} /> Instalar App
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
