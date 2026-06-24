'use client';

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { api } from "@/lib/api";

interface KairosContext {
  profile: {
    personality: string;
    preferences: Record<string, unknown>;
  };
  habits: Array<{
    name: string;
    frequency: string;
    targetCount: number;
    logs: Array<{ date: string; count: number }>;
  }>;
  streaks: Array<{ type: string; currentCount: number; bestCount: number }>;
  goals: Array<{
    title: string;
    type: string;
    targetValue: number;
    currentValue: number;
    isCompleted: boolean;
    deadline: string | null;
  }>;
  books: Array<{
    title: string;
    author: string | null;
    totalPages: number;
    pagesRead: number;
    status: string;
  }>;
  bible: {
    totalChaptersRead: number;
    books: Record<string, number>;
  };
  pomodoro: {
    totalSessions: number;
    totalMinutes: number;
    averagePerDay: number;
  };
}

function formatNumbers(value: number) {
  return Intl.NumberFormat("pt-BR").format(value);
}

export default function Home() {
  const [context, setContext] = useState<KairosContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<KairosContext>("/kairos/context")
      .then(setContext)
      .catch((err) => setError(err.message || "Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <main className="flex min-h-screen flex-col items-center justify-start p-8">
        <div className="w-full max-w-6xl space-y-6">
          <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">DisciplinaApp</h1>
                <p className="mt-2 text-gray-600">
                  Painel de controle inicial conectado aos seus dados e ao Kairos.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950 px-5 py-3 text-white shadow-lg shadow-slate-950/10">
                <p className="text-xs uppercase text-slate-300">Personalidade Kairos</p>
                <p className="mt-1 text-lg font-medium">
                  {context?.profile.personality ?? "Carregando..."}
                </p>
              </div>
            </div>
          </section>

          {loading ? (
            <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-10 text-center text-slate-500 shadow-sm">
              Carregando dados do Kairos...
            </section>
          ) : error ? (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
              <strong>Erro:</strong> {error}
            </section>
          ) : context ? (
            <section className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_minmax(240px,1.1fr)]">
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Hábitos</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">
                    {formatNumbers(context.habits.length)} hábitos ativos
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {context.habits.filter((habit) => habit.logs.length > 0).length} hábitos com registros recentes.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Bíblia</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">
                    {formatNumbers(context.bible.totalChaptersRead)} capítulos lidos
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {Object.keys(context.bible.books).length} livros bíblicos com progresso.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Pomodoro</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">
                    {formatNumbers(context.pomodoro.totalSessions)} sessões
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatNumbers(context.pomodoro.totalMinutes)} minutos de foco, média {context.pomodoro.averagePerDay.toFixed(1)} por dia.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Progresso</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-950">
                        {formatNumbers(context.goals.filter((goal) => goal.isCompleted).length)} / {formatNumbers(context.goals.length)} metas completas
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
                      {context.goals.length > 0
                        ? `${Math.round((context.goals.filter((goal) => goal.isCompleted).length / context.goals.length) * 100)}%`
                        : "0%"}
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Livros em leitura</p>
                      <p className="mt-2 text-sm text-slate-700">
                        {formatNumbers(context.books.filter((book) => book.status !== "FINISHED").length)} em progresso
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Maior streak</p>
                      <p className="mt-2 text-sm text-slate-700">
                        {context.streaks.length > 0
                          ? `${formatNumbers(Math.max(...context.streaks.map((s) => s.bestCount)))} dias`
                          : "Sem registros ainda"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Resumo rápido</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Tipos de streak</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{formatNumbers(context.streaks.length)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Preferências Kairos</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{formatNumbers(Object.keys(context.profile.preferences || {}).length)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </AuthGuard>
  );
}
