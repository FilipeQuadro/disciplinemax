"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { ShieldOff, RefreshCw } from "lucide-react";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, timedOut, retry, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);
  const isOnboarding = pathname === "/onboarding" || pathname === "/progresso";

  useEffect(() => {
    if (!loading && !timedOut && !user && !isPublic && !isOnboarding) {
      router.replace("/login");
    }
    if (!loading && !timedOut && user && isPublic) {
      router.replace("/");
    }
  }, [user, loading, timedOut, router, isPublic, isOnboarding]);

  // Check onboarding status for authenticated users
  useEffect(() => {
    async function checkOnboarding() {
      if (!user || onboardingChecked) return;
      try {
        const { data, error } = await dataFetch({
          action: "select",
          table: "user_settings",
          filters: { eq: { user_id: user.id }, select: "user_id", maybeSingle: true },
        });
        if (error) return;
        if (!data) {
          // No user_settings → onboarding not completed
          setOnboardingChecked(true);
          if (!isOnboarding) {
            router.replace("/onboarding");
          }
          return;
        }
        // Has settings → onboarding done
        setOnboardingChecked(true);
        if (isOnboarding) {
          router.replace("/");
        }
      } catch {
        setOnboardingChecked(true);
      }
    }
    if (!loading && !timedOut && user) {
      checkOnboarding();
    }
  }, [user, loading, timedOut, onboardingChecked, isOnboarding, router]);

  useEffect(() => {
    async function checkBlocked() {
      if (!user) return;
      try {
        const { data, error } = await dataFetch({ action: "select", table: "blocked_users", filters: { eq: { user_id: user.id }, maybeSingle: true, select: "user_id" } });
        if (error) {
          return;
        }
        if (data) setBlocked(true);
      } catch (err) {
        console.error("Blocked user check failed:", err);
      }
    }
    if (user) checkBlocked();
  }, [user]);

  if (timedOut && !user) {
    return (
      <div role="alert" aria-live="assertive" className="flex items-center justify-center h-screen" style={{ background: "#0B0E14" }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(212,175,55,0.1)" }}>
            <RefreshCw size={28} style={{ color: "#D4AF37" }} />
          </div>
          <h2 className="text-xl font-serif font-semibold tracking-tight text-white">Conexão lenta</h2>
          <p className="text-sm" style={{ color: "#8B95A5" }}>Não foi possível verificar sua sessão. Verifique sua conexão e tente novamente.</p>
          <button onClick={retry} className="btn-primary text-sm mt-2">Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-live="polite" className="flex items-center justify-center h-screen" style={{ background: "#0B0E14" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: "linear-gradient(135deg, #A8892B, #D4AF37)" }}>
            <div className="w-4 h-4 rounded-full bg-[#0B0E14]" />
          </div>
          <p className="text-xs tracking-[0.2em] uppercase" style={{ color: "#7E8E9F" }}>Carregando...</p>
        </div>
      </div>
    );
  }

  // Public pages (like /login) render freely regardless of auth state
  if (isPublic) {
    return <>{children}</>;
  }

  if (!user) return null;

  // Onboarding page is accessible to authenticated users
  // (redirect logic handled in the effect above)
  if (isOnboarding) {
    return <>{children}</>;
  }

  if (blocked) {
    return (
      <div role="alert" aria-live="assertive" className="flex items-center justify-center h-screen" style={{ background: "#0B0E14" }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(217,79,79,0.1)" }}>
            <ShieldOff size={28} style={{ color: "#D94F4F" }} />
          </div>
          <h2 className="text-xl font-serif font-semibold tracking-tight text-white">Conta Bloqueada</h2>
          <p className="text-sm" style={{ color: "#8B95A5" }}>Sua conta foi bloqueada pelo administrador. Entre em contato para mais informações.</p>
          <button onClick={signOut} className="btn-primary text-sm mt-2">Sair</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
