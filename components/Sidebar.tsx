"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Cross, Timer, Bell, Settings,
  Menu, X, Flame, Target, ChevronRight, BookMarked
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { clsx } from "clsx";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", color: "text-sky-400" },
  { href: "/livros", icon: BookOpen, label: "Livros", color: "text-violet-400" },
  { href: "/biblia", icon: BookMarked, label: "Bíblia", color: "text-amber-400" },
  { href: "/pomodoro", icon: Timer, label: "Pomodoro", color: "text-red-400" },
  { href: "/configuracoes", icon: Settings, label: "Configurações", color: "text-slate-400" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { streak, pomodoroActive, sidebarOpen, setSidebarOpen } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden glass p-2.5 rounded-xl"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed md:relative z-40 h-full transition-all duration-300",
          "flex flex-col bg-dark-800 border-r border-white/5",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center">
                  <Target size={16} className="text-white" />
                </div>
                <span className="font-bold text-white text-sm">DisciplinaApp</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 ml-10">Mentor de estudos</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex glass p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto"
          >
            <ChevronRight size={14} className={clsx("transition-transform", !sidebarOpen && "rotate-180")} />
          </button>
        </div>

        {/* Streak */}
        {sidebarOpen && streak > 0 && (
          <div className="mx-3 mt-4 p-3 rounded-xl bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/20">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-orange-400" />
              <div>
                <p className="text-xs font-bold text-orange-300">{streak} dias seguidos!</p>
                <p className="text-xs text-orange-400/70">Continue assim 🔥</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 mt-2">
          {sidebarOpen && <p className="section-title px-2">Menu</p>}
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
                <item.icon size={18} className={active ? item.color : "text-slate-500"} />
                {sidebarOpen && <span className={clsx(active && "text-white")}>{item.label}</span>}
                {sidebarOpen && pomodoroActive && item.href === "/pomodoro" && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/5">
            <div className="glass rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Bell size={14} className="text-sky-400" />
                <span className="text-xs font-medium text-slate-300">Notificações</span>
              </div>
              <p className="text-xs text-slate-500">Ativas e te monitorando 24h 👀</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
