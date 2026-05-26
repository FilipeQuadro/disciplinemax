"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUserId, clearUserData } = useStore();

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    // Safety timeout — if getSession hangs (network issue), stop loading after 8s
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(safetyTimeout);
      const uid = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      setUserId(uid);
      setLoading(false);
    }).catch(() => {
      clearTimeout(safetyTimeout);
      setLoading(false);
    });

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
      clearTimeout(safetyTimeout);
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
      const userId = data.user.id;
      // Create settings and bible_goals regardless of email confirmation status
      await (supabase.from("user_settings") as any).upsert({
        user_id: userId,
        notification_times: ["07:00", "12:00", "19:00"],
        pomodoro_duration: 25,
        short_break: 5,
        long_break: 15,
        pomodoros_until_long: 4,
        daily_books_goal: 20,
        daily_bible_chapters: 3,
        timezone: "America/Sao_Paulo",
      });
      await (supabase.from("bible_goals") as any).upsert({
        user_id: userId,
        daily_chapters: 3,
        plan_name: "custom",
      });
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
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
