import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Book, BibleGoal, PomodoroSession, DailyStats, UserSettings } from "@/lib/supabase";

interface AppState {
  // User
  userId: string | null;
  setUserId: (id: string | null) => void;
  clearUserData: () => void;

  // Books
  books: Book[];
  setBooks: (books: Book[]) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;

  // Bible
  bibleGoal: BibleGoal | null;
  setBibleGoal: (goal: BibleGoal | null) => void;
  todayBibleChapters: number;
  setTodayBibleChapters: (n: number) => void;

  // Pomodoro
  pomodoroActive: boolean;
  pomodoroTimeLeft: number;
  pomodoroIsBreak: boolean;
  pomodoroCount: number;
  pomodoroTask: string;
  setPomodoroActive: (v: boolean) => void;
  setPomodoroTimeLeft: (v: number | ((prev: number) => number)) => void;
  setPomodoroIsBreak: (v: boolean) => void;
  setPomodoroCount: (v: number) => void;
  setPomodoroTask: (v: string) => void;
  todaySessions: PomodoroSession[];
  setTodaySessions: (s: PomodoroSession[]) => void;
  addSession: (s: PomodoroSession) => void;

  // Stats
  todayStats: DailyStats | null;
  setTodayStats: (s: DailyStats | null) => void;
  streak: number;
  setStreak: (n: number) => void;

  // Settings
  settings: UserSettings | null;
  setSettings: (s: UserSettings | null) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      userId: null,
      setUserId: (id) => set({ userId: id }),
      clearUserData: () => set({
        books: [],
        bibleGoal: null,
        todayBibleChapters: 0,
        todaySessions: [],
        todayStats: null,
        streak: 0,
        settings: null,
        pomodoroCount: 0,
        pomodoroActive: false,
        pomodoroTimeLeft: 25 * 60,
        pomodoroIsBreak: false,
        pomodoroTask: "",
      }),

      books: [],
      setBooks: (books) => set({ books }),
      updateBook: (id, updates) =>
        set((s) => ({
          books: s.books.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      bibleGoal: null,
      setBibleGoal: (g) => set({ bibleGoal: g }),
      todayBibleChapters: 0,
      setTodayBibleChapters: (n) => set({ todayBibleChapters: n }),

      pomodoroActive: false,
      pomodoroTimeLeft: 25 * 60,
      pomodoroIsBreak: false,
      pomodoroCount: 0,
      pomodoroTask: "",
      setPomodoroActive: (v) => set({ pomodoroActive: v }),
      setPomodoroTimeLeft: (v) =>
        set((state) => ({ pomodoroTimeLeft: typeof v === "function" ? v(state.pomodoroTimeLeft) : v })),
      setPomodoroIsBreak: (v) => set({ pomodoroIsBreak: v }),
      setPomodoroCount: (v) => set({ pomodoroCount: v }),
      setPomodoroTask: (v) => set({ pomodoroTask: v }),
      todaySessions: [],
      setTodaySessions: (s: PomodoroSession[]) => set({ todaySessions: s }),
      addSession: (s: PomodoroSession) => set((st) => ({ todaySessions: [...st.todaySessions, s] })),

      todayStats: null,
      setTodayStats: (s) => set({ todayStats: s }),
      streak: 0,
      setStreak: (n) => set({ streak: n }),

      settings: null,
      setSettings: (s) => set({ settings: s }),

      sidebarOpen: true,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      notificationsEnabled: false,
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
    }),
    { name: "disciplina-store", partialize: (s) => ({
      streak: s.streak,
      pomodoroCount: s.pomodoroCount,
      sidebarOpen: s.sidebarOpen,
      notificationsEnabled: s.notificationsEnabled,
    }) }
  )
);
