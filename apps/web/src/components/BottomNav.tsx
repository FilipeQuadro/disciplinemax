"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Timer, BookMarked, Settings } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/habits", icon: Target, label: "Hábitos" },
  { href: "/pomodoro", icon: Timer, label: "Pomodoro", center: true },
  { href: "/biblia", icon: BookMarked, label: "Bíblia" },
  { href: "/configuracoes", icon: Settings, label: "Ajustes" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);

  const profileHref = user ? "/configuracoes" : "/login";

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
      style={{
        background: "rgba(11,14,20,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "var(--border)",
        paddingBottom: "max(4px, env(safe-area-inset-bottom, 4px))",
      }}
      aria-label="Navegação principal mobile"
    >
      <div className="flex items-end justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isCenter = "center" in item && item.center;
          const href = item.label === "Ajustes" ? profileHref : item.href;
          const active =
            item.label === "Ajustes"
              ? pathname.startsWith("/configuracoes") || pathname.startsWith("/u/")
              : isActive(item.href);

          if (isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-end -mt-4 relative"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <div
                  className={cx(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
                    "active:scale-95",
                  )}
                  style={{
                    background: active
                      ? "linear-gradient(135deg, var(--danger), #ff6b6b)"
                      : "linear-gradient(135deg, var(--danger), #e84a4a)",
                    boxShadow: active
                      ? "0 4px 20px rgba(217,79,79,0.4), 0 0 0 2px rgba(217,79,79,0.15)"
                      : "0 4px 16px rgba(217,79,79,0.25)",
                  }}
                >
                  <Icon size={22} className="text-white" />
                </div>
                <span
                  className="text-[10px] mt-1 font-medium leading-none"
                  style={{ color: active ? "var(--danger)" : "var(--text-muted)" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={href}
              className="flex flex-col items-center justify-end py-2 min-w-[44px] min-h-[44px]"
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={20}
                className={cx(
                  "transition-colors duration-200",
                  active ? "text-[var(--gold)]" : "text-[var(--text-muted)]",
                )}
              />
              <span
                className="text-[10px] mt-1 font-medium leading-none transition-colors duration-200"
                style={{ color: active ? "var(--gold)" : "var(--text-muted)" }}
              >
                {item.label}
              </span>
              {active && (
                <div
                  className="w-1 h-1 rounded-full mt-1"
                  style={{ background: "var(--gold)", boxShadow: "0 0 6px rgba(212,175,55,0.4)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
