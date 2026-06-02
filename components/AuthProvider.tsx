"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  timedOut: boolean;
  retry: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  timedOut: false,
  retry: () => {},
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const { setUserId, clearUserData } = useStore();

  function initSession() {
    if (!supabase) { setLoading(false); return; }

    setLoading(true);
    setTimedOut(false);

    const safetyTimeout = setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(safetyTimeout);
      const uid = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      setUserId(uid);
      setLoading(false);
      setTimedOut(false);
    }).catch(() => {
      clearTimeout(safetyTimeout);
      setLoading(false);
      setTimedOut(true);
    });

    return safetyTimeout;
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    const safetyTimeout = initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUid = session?.user?.id ?? null;

      setUser((prev) => {
        if (newUid !== (prev?.id ?? null)) {
          clearUserData();
        }
        return session?.user ?? null;
      });
      setUserId(newUid);
    });

    return () => {
      if (safetyTimeout) clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [setUserId, clearUserData]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (!error && data.user) {
      // Auto-confirm email via server API
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/auth/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ userId: data.user.id }),
        });
      } catch { /* auto-confirm is best-effort */ }
    }
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    clearUserData();
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, timedOut, retry: initSession, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
