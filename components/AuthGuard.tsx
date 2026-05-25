"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

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

  if (!user) return null;

  return <>{children}</>;
}
