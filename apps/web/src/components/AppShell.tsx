"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("@/components/Sidebar").then((mod) => ({ default: mod.Sidebar })), {
  ssr: false,
});

const BottomNav = dynamic(() => import("@/components/BottomNav").then((mod) => ({ default: mod.BottomNav })), {
  ssr: false,
});

const HIDE_SIDEBAR_PATHS = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = HIDE_SIDEBAR_PATHS.some((p) => pathname === p);

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden relative z-10 safe-area-inset">
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
