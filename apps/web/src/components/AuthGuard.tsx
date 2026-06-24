"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useAppStore } from "@/stores/appStore";

function AuthGuardContent({ children }: { children: ReactNode }) {
  const user = useAppStore((s) => s.user);
  const { loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  return <AuthGuardContent>{children}</AuthGuardContent>;
}
