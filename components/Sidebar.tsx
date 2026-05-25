"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Timer, Bell, Settings,
  Menu, X, Flame, FlameKindling, ChevronRight, BookMarked, LogOut, LogIn
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { clsx } from "clsx";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", color: "text-[#D4AF37]" },
  { href: "/livros", icon: BookOpen, label: "Livros", color: "text-[#7C6BBD]" },
  { href: "/biblia", icon: BookMarked, label: "Bíblia", color: "text-[#D4AF37]" },
  { href: "/pomodoro", icon: Timer, label: "Pomodoro", color: "text-[#D94F4F]" },
  { href: "/configuracoes", icon: Settings, label: "Configurações", color: "text-[#8B95A5]" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { streak, pomodoroActive, sidebarOpen, setSidebarOpen } = useStore();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden glass p-2.5 rounded-xl hover:bg-white/5 transition-all duration-300"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={18} className="text-slate-300" /> : <Menu size={18} className="text-slate-400" />}
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed md:relative z-40 h-full transition-all duration-300 ease-out",
          "flex flex-col border-r",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          sidebarOpen ? "w-64" : "w-16"
        )}
        style={{ background: "#0D1018", borderColor: "rgba(255,255,255,0.04)" }}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #D4AF37, #F5D060)",
                  boxShadow: "0 0 30px rgba(212,175,55,0.25), 0 0 60px rgba(212,175,55,0.1)",
                }}
              >
                <FlameKindling size={18} className="text-[#0B0E14]" />
              </div>
              <div>
                <span className="font-serif font-bold text-white text-sm tracking-tight">DisciplinaMax</span>
                <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "#555E6E" }}>Mentor de Disciplina</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex glass p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-auto"
            style={{ color: "#555E6E" }}
          >
            <ChevronRight size={14} className={clsx("transition-transform duration-300", !sidebarOpen && "rotate-180")} />
          </button>
        </div>

        {/* Streak */}
        {sidebarOpen && streak > 0 && (
          <div className="mx-3 mt-4 p-3 rounded-xl transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, rgba(232,132,74,0.08), rgba(217,79,79,0.04))",
              border: "1px solid rgba(232,132,74,0.12)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <Flame size={18} style={{ color: "#E8844A" }} />
              <div>
                <p className="text-xs font-bold" style={{ color: "#E8844A" }}>{streak} dias seguidos!</p>
                <p className="text-[10px]" style={{ color: "rgba(232,132,74,0.4)" }}>Continue assim 🔥</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          {sidebarOpen && <p className="section-title px-3 mb-2">Menu</p>}
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  "nav-item",
                  active && "active",
                  !sidebarOpen && "justify-center px-2"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon size={18} className={clsx("transition-colors duration-300", active ? item.color : "text-[#555E6E]")} />
                {sidebarOpen && <span className={clsx(active && "text-white font-medium")}>{item.label}</span>}
                {sidebarOpen && active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#D4AF37", boxShadow: "0 0 8px rgba(212,175,55,0.4)" }} />
                )}
                {sidebarOpen && pomodoroActive && item.href === "/pomodoro" && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Bell size={13} style={{ color: "#D4AF37" }} />
                <span className="text-[11px] font-medium" style={{ color: "#8B95A5" }}>Notificações</span>
              </div>
              <p className="text-[10px]" style={{ color: "#555E6E" }}>Ativas e te monitorando 24h 👀</p>
            </div>
            <div className="mt-2">
              {user ? (
                <button onClick={signOut} className="nav-item w-full justify-center gap-2 text-xs" style={{ color: "#8B95A5" }}>
                  <LogOut size={14} /> Sair
                </button>
              ) : (
                <Link href="/login" className="nav-item w-full justify-center gap-2 text-xs" style={{ color: "#D4AF37" }}>
                  <LogIn size={14} /> Entrar
                </Link>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
