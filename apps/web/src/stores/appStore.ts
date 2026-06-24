import { create } from "zustand";
import type { AuthUser } from "@/lib/auth";

interface AppState {
  user: AuthUser | null;
  setUser: (user: AppState["user"]) => void;
  kairosOpen: boolean;
  toggleKairos: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  kairosOpen: false,
  toggleKairos: () => set((state) => ({ kairosOpen: !state.kairosOpen })),
}));
