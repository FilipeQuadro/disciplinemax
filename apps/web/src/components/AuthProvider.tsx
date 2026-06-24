"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  register as apiRegister,
  setSession,
  clearSession,
  getStoredUser,
  getToken,
  type AuthUser,
} from "@/lib/auth";
import { useAppStore } from "@/stores/appStore";

interface AuthContextValue {
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAppStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, [setUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user, token } = await apiLogin(email, password);
      setSession(token, user);
      setUser(user);
    },
    [setUser],
  );

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      const { user, token } = await apiRegister(email, name, password);
      setSession(token, user);
      setUser(user);
    },
    [setUser],
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export type { AuthUser };
