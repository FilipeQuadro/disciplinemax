"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  BookMarked,
  Timer,
  Settings,
  Menu,
  X,
  FlameKindling,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useAuth } from "@/components/AuthProvider";

function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/habits", icon: Target, label: "Hábitos" },
  { href: "/biblia", icon: BookMarked, label: "Bíblia" },
  { href: "/pomodoro", icon: Timer, label: "Pomodoro" },
  { href: "/configuracoes", icon: Settings, label: "Configurações" },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
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

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cx(
          "fixed md:relative z-40 h-full transition-all duration-300 ease-out",
          "flex flex-col border-r overflow-y-auto overscroll-contain",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          sidebarOpen ? "w-64" : "w-16",
        )}
        style={{
          background: "var(--bg-sidebar)",
          borderColor: "var(--border)",
          WebkitOverflowScrolling: "touch",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
        }}
      >
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
                <span className="font-serif font-semibold text-white text-sm tracking-tight">DisciplinaApp</span>
                <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--text-secondary)" }}>
                  Disciplina & Crescimento
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex min-w-[44px] min-h-[44px] items-center justify-center glass rounded-lg hover:bg-white/5 transition-colors ml-auto"
            style={{ color: "var(--text-secondary)" }}
            aria-label={sidebarOpen ? "Recolher sidebar" : "Expandir sidebar"}
          >
            <ChevronRight size={14} className={cx("transition-transform duration-300", !sidebarOpen && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 flex flex-col justify-center" style={{ minHeight: 0 }}>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={cx(
                    "nav-item",
                    active && "active",
                    !sidebarOpen && "justify-center px-2",
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                  aria-label={!sidebarOpen ? item.label : undefined}
                >
                  <item.icon
                    size={18}
                    className={cx(
                      "transition-colors duration-300",
                      active ? "text-[var(--gold)]" : "text-[var(--text-secondary)]",
                    )}
                  />
                  {sidebarOpen && <span className={cx(active && "text-white font-medium")}>{item.label}</span>}
                  {sidebarOpen && active && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--gold)", boxShadow: "0 0 8px rgba(212,175,55,0.4)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {sidebarOpen && (
          <div
            className="p-3 shrink-0"
            style={{ borderTop: "1px solid var(--border)", paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
          >
            {user && (
              <div className="glass rounded-xl p-3 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
                    style={{
                      background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
                      color: "var(--bg-primary)",
                    }}
                  >
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{user.name}</p>
                    <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className="nav-item w-full justify-center gap-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
