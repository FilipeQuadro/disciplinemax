"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { ShieldOff } from "lucide-react";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace("/login");
    }
    if (!loading && user && isPublic) {
      router.replace("/");
    }
  }, [user, loading, router, isPublic]);

  useEffect(() => {
    async function checkBlocked() {
      if (!user) return;
      try {
        const { data, error } = await dataFetch({ action: "select", table: "blocked_users", filters: { eq: { user_id: user.id }, maybeSingle: true, select: "user_id" } });
        if (error) {
          console.warn("blocked_users check failed:", error);
          return;
        }
        if (data) setBlocked(true);
      } catch (err) {
        console.warn("Blocked user check failed:", err);
      }
    }
    if (user) checkBlocked();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0B0E14" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: "linear-gradient(135deg, #A8892B, #D4AF37)" }}>
            <div className="w-4 h-4 rounded-full bg-[#0B0E14]" />
          </div>
          <p className="text-xs tracking-[0.2em] uppercase" style={{ color: "#555E6E" }}>Carregando...</p>
        </div>
      </div>
    );
  }

  // Public pages (like /login) render freely regardless of auth state
  if (isPublic) {
    return <>{children}</>;
  }

  if (!user) return null;

  if (blocked) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0B0E14" }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(217,79,79,0.1)" }}>
            <ShieldOff size={28} style={{ color: "#D94F4F" }} />
          </div>
          <h2 className="text-xl font-serif font-bold text-white">Conta Bloqueada</h2>
          <p className="text-sm" style={{ color: "#8B95A5" }}>Sua conta foi bloqueada pelo administrador. Entre em contato para mais informações.</p>
          <button onClick={signOut} className="btn-primary text-sm mt-2">Sair</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
