# Migration Map — DisciplinaApp (Antigo) → Monorepo Atual

> **Base:** Leitura exaustiva de todos os arquivos em `C:\Users\quadr\Downloads\disciplina-app\disciplina-app\`
> **Data:** 2025-06-19
> **Regra:** Read-only. Nenhuma inferência. Toda evidência cite o arquivo e a linha de import/hook/chamada.

---

## 1. Inventário Completo de Páginas

| # | Rota | Arquivo | Linhas | Auth | Dependência Supabase | Dependência API Routes |
|---|---|---|---|---|---|---|
| 1 | `/` (Dashboard) | `app/page.tsx` | ~600 | `useAuth()` | `dataFetch` (5 tabelas), `authFetch` (1 RPC) | `/api/dashboard` |
| 2 | `/login` | `app/login/page.tsx` | ~170 | `useAuth()` | `signIn/signUp` (Supabase Auth direto) | `/api/auth/guest`, `/api/auth/confirm` |
| 3 | `/onboarding` | `app/onboarding/page.tsx` | ~350 | `useAuth()` | `dataFetch` (3 tabelas: `user_settings`, `user_plans`, `bible_goals`) + `OnboardingService` | Nenhuma API route direta |
| 4 | `/pomodoro` | `app/pomodoro/page.tsx` | ~300 | `useAuth()` | `dataFetch` (1 tabela: `pomodoro_sessions`) | Nenhuma — usa `dataFetch` direto |
| 5 | `/livros` | `app/livros/page.tsx` | ~400 | `useAuth()` | `dataFetch` (2 tabelas: `books`, `user_plans`) | Nenhuma — usa `dataFetch` direto |
| 6 | `/biblia` | `app/biblia/page.tsx` | ~350 | `useAuth()` | `dataFetch` (3 tabelas: `bible_readings`, `bible_goals`, `daily_stats`) + `getBibleVerseOfDay()` | Nenhuma |
| 7 | `/progresso` | `app/progresso/page.tsx` | ~250 | `useAuth()` | `dataFetch` (5 tabelas) | Nenhuma |
| 8 | `/configuracoes` | `app/configuracoes/page.tsx` | ~400 | `useAuth()` | `dataFetch` (1 tabela: `user_settings`) | `/api/profile`, `/api/referral` |
| 9 | `/amigos` | `app/amigos/page.tsx` | ~400 | `useAuth()` | Nenhuma direta | `/api/friends`, `/api/leaderboard` |
| 10 | `/feed` | `app/feed/page.tsx` | ~120 | `useAuth()` | Nenhuma direta | `/api/feed` |
| 11 | `/ranking` | `app/ranking/page.tsx` | ~200 | Nenhuma | Nenhuma | `/api/leaderboard` |
| 12 | `/desafios` | `app/desafios/page.tsx` | ~200 | `useAuth()` | Nenhuma direta | `/api/community-events` |
| 13 | `/grupos` | `app/grupos/page.tsx` | ~200 | `useAuth()` | Nenhuma direta | `/api/groups` |
| 14 | `/planos` | `app/planos/page.tsx` | ~200 | `useAuth()` | `dataFetch` (1 tabela: `user_plans`) | Nenhuma |
| 15 | `/admin` | `app/admin/page.tsx` | ~700 | `useAuth()` | `dataFetch` (1 tabela: `admin_users`) + `supabase.auth.getSession()` | `/api/admin/stats`, `/api/admin/users`, `/api/admin/audit`, `/api/admin/diagnostics`, `/api/admin/manage`, `/api/admin/analytics`, `/api/migrate` |
| 16 | `/u/[username]` | `app/u/[username]/page.tsx` | ~150 | Nenhuma | Nenhuma | `/api/u/[username]` |

**Total: 16 páginas**

---

## 2. Inventário Completo de Componentes

| # | Arquivo | Tipo | Dependências Externas | Dependências Internas | Supabase? |
|---|---|---|---|---|---|
| 1 | `components/ui/ProgressRing.tsx` | UI puro | Nenhuma | Nenhuma | ❌ |
| 2 | `components/ui/GradientCard.tsx` | UI puro | Nenhuma | Nenhuma | ❌ |
| 3 | `components/ui/StatCard.tsx` | UI puro | `lucide-react` | Nenhuma | ❌ |
| 4 | `components/ui/Badge.tsx` | UI puro | Nenhuma | Nenhuma | ❌ |
| 5 | `components/ui/HeroHeader.tsx` | UI puro | `lucide-react`, `date-fns` | Nenhuma | ❌ |
| 6 | `components/ui/GoalBadge.tsx` | UI puro | `lucide-react` | Nenhuma | ❌ |
| 7 | `components/EmptyState.tsx` | UI puro | `lucide-react`, `next/link` | Nenhuma | ❌ |
| 8 | `components/Skeleton.tsx` | UI puro | Nenhuma | Nenhuma | ❌ |
| 9 | `components/ErrorCard.tsx` | UI puro | `lucide-react` | Nenhuma | ❌ |
| 10 | `components/ErrorBoundary.tsx` | Classe React | Nenhuma | Nenhuma | ❌ |
| 11 | `components/ConfirmDialog.tsx` | Modal acessível | `lucide-react` | Nenhuma | ❌ |
| 12 | `components/BackgroundParticles.tsx` | Efeito visual | Nenhuma | Nenhuma | ❌ |
| 13 | `components/AmbientSound.tsx` | Web Audio API | `lucide-react` | Nenhuma | ❌ |
| 14 | `components/Achievements.tsx` | Hook + UI | `lucide-react`, `clsx` | `dataFetch` (linha 5), `useAuth` (linha 6), `useStore` (linha 4) | ✅ `dataFetch` |
| 15 | `components/AppShell.tsx` | Layout | `next/navigation` | `Sidebar` (dynamic import), `BottomNav` (dynamic import) | ❌ |
| 16 | `components/Sidebar.tsx` | Navegação | `lucide-react`, `clsx`, `next/link`, `next/navigation`, `react-hot-toast` | `useStore` (linha 11), `useAuth` (linha 12), `dataFetch` (linha 13) | ✅ `dataFetch` para admin check |
| 17 | `components/BottomNav.tsx` | Navegação mobile | `lucide-react`, `clsx`, `next/link`, `next/navigation` | `useAuth` (linha 6) | ❌ |
| 18 | `components/IntroScreen.tsx` | Splash screen | `lucide-react` | Nenhuma | ❌ (mas chama `/api/health`) |
| 19 | `components/AuthProvider.tsx` | Context de Auth | `@supabase/supabase-js` (linha 3), `zustand` | `supabase` (linha 4), `useStore` | ✅ Supabase Auth direto |
| 20 | `components/AuthGuard.tsx` | Proteção de rotas | `lucide-react`, `next/navigation` | `useAuth` (linha 4), `dataFetch` (linha 5), `logger` (linha 6) | ✅ `dataFetch` para onboarding + blocked check |
| 21 | `components/NotificationInit.tsx` | Push notifications | `@capacitor/core` (linha 3), `@capacitor/push-notifications` (dynamic) | `notifications.ts` (linha 4), `useStore` (linha 5), `useAuth` (linha 6), `supabase` (dynamic import) | ✅ Supabase session para push |
| 22 | `components/PwaInstallListener.tsx` | PWA install | `lucide-react` | `useStore` (linha 3) | ❌ |
| 23 | `components/SwRegistrar.tsx` | Service Worker | Nenhuma | `notifications.ts` (linha 2) | ❌ |

**Total: 23 componentes** (6 em `ui/`, 17 na raiz)

---

## 3. Mapa de Dependências Supabase

### 3.1 Arquivos que importam `@supabase/supabase-js` diretamente

| Arquivo | Linha | Import |
|---|---|---|
| `lib/supabase.ts` | 1 | `import { createClient, SupabaseClient } from "@supabase/supabase-js"` |
| `components/AuthProvider.tsx` | 3 | `import type { User } from "@supabase/supabase-js"` |
| `components/NotificationInit.tsx` | dynamic | `const { supabase: sb } = await import("@/lib/supabase")` |
| `app/admin/page.tsx` | 3 | `import { supabase } from "@/lib/supabase"` |

### 3.2 Arquivos que usam `dataFetch` (wrapper Supabase REST)

| Arquivo | Tabelas acessadas |
|---|---|
| `app/page.tsx` (Dashboard) | `books`, `bible_goals`, `user_settings`, `daily_stats`, `bible_readings`, `user_xp`, `user_challenges`, `user_insights`, `user_achievements` |
| `app/livros/page.tsx` | `books`, `user_plans` |
| `app/biblia/page.tsx` | `bible_readings`, `bible_goals`, `daily_stats` |
| `app/progresso/page.tsx` | `user_streaks`, `user_xp`, `user_achievements`, `user_challenges`, `user_insights` |
| `app/configuracoes/page.tsx` | `user_settings` |
| `app/onboarding/page.tsx` | `user_settings`, `user_plans`, `bible_goals` |
| `app/pomodoro/page.tsx` | `pomodoro_sessions` |
| `app/planos/page.tsx` | `user_plans` |
| `app/admin/page.tsx` | `admin_users` |
| `components/Sidebar.tsx` | `admin_users` |
| `components/AuthGuard.tsx` | `user_settings`, `blocked_users` |
| `components/Achievements.tsx` | `achievements` |
| `lib/stats.ts` | `daily_stats` (insert/update/select) |

### 3.3 Arquivos que usam `authFetch` (wrapper que injeta token Supabase)

| Arquivo | Endpoints chamados |
|---|---|
| `app/page.tsx` | `/api/dashboard?userId=...` |
| `app/configuracoes/page.tsx` | `/api/profile`, `/api/referral` |
| `app/amigos/page.tsx` | `/api/friends` |
| `app/feed/page.tsx` | `/api/feed` |
| `app/grupos/page.tsx` | `/api/groups` |
| `app/desafios/page.tsx` | `/api/community-events` |
| `lib/gamification.ts` | `/api/gamification` |
| `lib/share.ts` | `/api/share` |

### 3.4 Arquivos que usam `supabase.auth` diretamente

| Arquivo | Uso |
|---|---|
| `components/AuthProvider.tsx` | `supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()`, `supabase.auth.signInWithPassword()`, `supabase.auth.signUp()`, `supabase.auth.signOut()` |
| `lib/data-fetch.ts` | `supabase.auth.getSession()` (para extrair token) |
| `lib/auth-fetch.ts` | `supabase.auth.getSession()` (para extrair token) |
| `app/admin/page.tsx` | `supabase.auth.getSession()` (para extrair token) |
| `components/NotificationInit.tsx` | `supabase.auth.getSession()` (dynamic import, para push) |
| `lib/notifications.ts` | `supabase.auth.getSession()` (dynamic import, para push subscription) |

### 3.5 Resumo de acoplamento Supabase

| Categoria | Quantidade |
|---|---|
| Arquivos que importam `@supabase/supabase-js` | 4 |
| Arquivos que usam `dataFetch` (wrapper REST) | 13 |
| Arquivos que usam `authFetch` (wrapper com token) | 8 |
| Arquivos que usam `supabase.auth.*` diretamente | 6 |
| **Total de arquivos com dependência Supabase** | **18** (de ~50 arquivos) |

---

## 4. Componentes 100% Reutilizáveis (zero dependência de Supabase)

Estes arquivos podem ser copiados para o monorepo atual sem nenhuma alteração:

| # | Arquivo | Evidência (imports) | Linhas |
|---|---|---|---|
| 1 | `components/ui/ProgressRing.tsx` | Sem imports externos além de React | ~35 |
| 2 | `components/ui/GradientCard.tsx` | `import { type ReactNode } from "react"` | ~45 |
| 3 | `components/ui/StatCard.tsx` | `import { type LucideIcon } from "lucide-react"` | ~35 |
| 4 | `components/ui/Badge.tsx` | `import { type ReactNode } from "react"` | ~50 |
| 5 | `components/ui/HeroHeader.tsx` | `import { type LucideIcon }`, `import { format } from "date-fns"`, `import { ptBR } from "date-fns/locale"` | ~40 |
| 6 | `components/ui/GoalBadge.tsx` | `import { Check } from "lucide-react"` | ~40 |
| 7 | `components/EmptyState.tsx` | `import { type LucideIcon }`, `import Link from "next/link"` | ~45 |
| 8 | `components/Skeleton.tsx` | Sem imports externos | ~120 |
| 9 | `components/ErrorCard.tsx` | `import { AlertCircle } from "lucide-react"` | ~35 |
| 10 | `components/ErrorBoundary.tsx` | `import { Component, ReactNode } from "react"` | ~60 |
| 11 | `components/ConfirmDialog.tsx` | `import { AlertTriangle, X } from "lucide-react"` | ~90 |
| 12 | `components/BackgroundParticles.tsx` | `import { useEffect, useState } from "react"` | ~35 |
| 13 | `components/AmbientSound.tsx` | `import { Volume2, VolumeX, CloudRain, Flame, Music } from "lucide-react"` | ~180 |
| 14 | `lib/fetch-with-timeout.ts` | `export async function fetchWithTimeout(...)` — usa `AbortController` nativo | ~20 |
| 15 | `lib/toast.ts` | `import { toast } from "react-hot-toast"` | ~10 |
| 16 | `lib/logger.ts` | Sem imports externos | ~60 |
| 17 | `app/globals.css` | CSS puro + `@tailwind` directives | ~450 |
| 18 | `tailwind.config.ts` | `import type { Config } from "tailwindcss"` | ~100 |
| 19 | `lib/services/level-service.ts` | Apenas matemática pura: `Math.floor(Math.sqrt(totalXp / 100)) + 1` | ~80 |

**Total: 19 arquivos — zero adaptação necessária**

---

## 5. Componentes Reutilizáveis com Adaptação

Estes arquivos têm valor mas precisam de mudanças para funcionar no monorepo:

| # | Arquivo | O que manter | O que trocar | Esforço |
|---|---|---|---|---|
| 1 | `components/AppShell.tsx` | Estrutura (Sidebar + BottomNav + main content area) | Imports de `Sidebar`/`BottomNav` (caminhos iguais) | ~0.5h |
| 2 | `components/Sidebar.tsx` | UI completa, animações, colapso, safe areas | Linha 13: `import { dataFetch }` → remover admin check (linhas 35-41); Linha 11: `import { useStore }` → manter se store for adaptado; Linha 12: `import { useAuth }` → trocar por novo AuthProvider; `navItems` array → ajustar rotas (remover feed/ranking/amigos/grupos/desafios/planos) | ~2h |
| 3 | `components/BottomNav.tsx` | UI mobile completa | Linha 6: `import { useAuth }` → trocar; `NAV_ITEMS` → ajustar rotas | ~1h |
| 4 | `components/IntroScreen.tsx` | Animação completa, audio chime, fade-out | Linha 95: `fetch("/api/health")` → trocar para `http://localhost:4000/api` ou remover health check | ~1h |
| 5 | `components/AuthGuard.tsx` | Lógica de redirect, loading state, timeout | Linha 5: `import { dataFetch }` → remover onboarding check (linhas 30-62) e blocked check (linhas 64-80); Linha 4: `import { useAuth }` → trocar | ~1.5h |
| 6 | `components/AuthProvider.tsx` | Interface do Context (`signIn`, `signUp`, `signOut`, `user`, `loading`) | Linha 3: `import type { User } from "@supabase/supabase-js"` → definir tipo próprio; Linha 4: `import { supabase }` → remover; `signIn`/`signUp`/`signOut` → chamar `/api/auth/login` e `/api/auth/register` via `fetch`, guardar JWT em localStorage | ~3h |
| 7 | `app/login/page.tsx` | UI completa (form, toggle login/signup, show/hide password, particles, modo demo) | Linha 3: `import { useAuth }` → manter (interface é a mesma); Remover "modo demo" (linhas 147-160) que chama `/api/auth/guest` | ~1.5h |
| 8 | `store/useStore.ts` | Estrutura Zustand com `persist`, 15+ campos | Tipos: `Book`, `BibleGoal`, `PomodoroSession`, `DailyStats`, `UserSettings` (linha 3: `import` de `@/lib/supabase`) → redefinir para tipos do Prisma; Adicionar `token: string \| null` | ~2h |
| 9 | `lib/api.ts` (atual) | Estrutura básica | Adicionar: interceptor JWT (header `Authorization: Bearer`), error handling, tipos genéricos | ~1h |
| 10 | `app/page.tsx` (Dashboard) | Estrutura visual completa (HeroHeader, ProgressRing, StatCards, ConsistencyCalendar, BookMiniCard, WeekStats) | Hook `useDashboardData` (linhas 24-140): trocar todas as chamadas `dataFetch`/`authFetch` por `api.get/post` para endpoints NestJS (`/api/habits`, `/api/gamification/level`, etc.) | ~6h |
| 11 | `app/pomodoro/page.tsx` | Timer completo, modos (focus/break), audio notificação, AmbientSound | Linha 6: `import { dataFetch }` → trocar por `api.post("/pomodoro-sessions"...)` — **mas endpoint não existe no NestJS**; Linha 8: `trackPomodoroCompleted` → remover ou adaptar; Linha 9: `processGamification` → adaptar | ~3h |
| 12 | `app/progresso/page.tsx` | UI de XP, streak, conquistas, desafios, insights | Linha 3: `import { dataFetch }` → trocar por `api.get("/gamification/level")`, `api.get("/gamification/achievements")`; Importar de `@/lib/services/level-service` (puro) e `@/lib/services/achievement-service` (adaptar) | ~3h |
| 13 | `app/onboarding/page.tsx` | UI de wizard de 5 passos | Linha 3: `import { dataFetch }` → não existe endpoint de onboarding no NestJS. Decisão: descartar por agora ou criar onboarding client-side (salvar preferências em localStorage) | ~3h se adaptado, 0h se descartado |
| 14 | `app/livros/page.tsx` | UI de CRUD de livros, BookCard, registro de leitura | Modelo Prisma `Book` ≠ modelo Supabase `Book` (campos diferentes: `pagesRead` vs `current_page`, `totalPages` vs `total_pages`); `dataFetch` → NestJS não tem endpoint `/books`; **decisão: usar como referência visual, reescrever para `/api/habits`** | ~4h |
| 15 | `app/biblia/page.tsx` | UI de registro bíblico, planos, gráfico semanal | `dataFetch` para `bible_readings`, `bible_goals`, `daily_stats` → não existe no NestJS; `getBibleVerseOfDay()` de `@/lib/ai` → função estática pura, reutilizável | ~3h |
| 16 | `lib/gamification.ts` | Estrutura de chamada | Linha 2: `import { authFetch }` → trocar por `api.post`; Linha 1: `import { useStore }` → manter; URL `/api/gamification` → NestJS tem `/api/gamification/level` e `/api/gamification/achievements` (GET, não POST) | ~1h |
| 17 | `lib/services/achievement-service.ts` | Definições `ACHIEVEMENTS` (10 badges com condições), interface `AchievementState` | Linha 1: `import { AchievementRepository }` → remover; Classe `AchievementService` → remover (NestJS cuida); Manter apenas `ACHIEVEMENTS` array e tipos | ~1h |
| 18 | `components/Achievements.tsx` | Hook `useAchievements`, `AchievementGrid`, `AchievementNotification` | Linha 4: `import { dataFetch }` → trocar por `api.get("/gamification/achievements")`; Linha 6: `import { useAuth }` → trocar; `BADGES` array → reavaliar (13 badges vs 10 no service) | ~2h |
| 19 | `middleware.ts` | Security headers, rate limiting | Adaptar para monorepo Next.js; Estrutura é a mesma | ~1h |

**Total: 19 arquivos — adaptação necessária**

---

## 6. Componentes que Devem Ser Descartados

| # | Arquivo | Motivo |
|---|---|---|
| 1 | `lib/supabase.ts` | Cliente Supabase não existe no monorepo. Tipos precisam ser redefinidos. |
| 2 | `lib/data-fetch.ts` | Wrapper PostgREST. Não aplicável ao NestJS. |
| 3 | `lib/auth-fetch.ts` | Wrapper que extrai token de sessão Supabase. Substituído por JWT em localStorage. |
| 4 | `lib/ai.ts` | Gemini/Ollama direto. Kairos (Python) substitui. |
| 5 | `lib/plans.ts` | MVP não tem planos pagos. |
| 6 | `lib/stats.ts` | Trackeia `daily_stats` via Supabase. Não existe tabela equivalente no Prisma. |
| 7 | `lib/schemas.ts` | Schemas Zod para API routes Next.js. NestJS tem `ValidationPipe`. |
| 8 | `lib/notifications.ts` | Push notifications. MVP não tem. |
| 9 | `lib/telegram.ts` | Notificações Telegram. MVP não tem. |
| 10 | `lib/web-push-server.ts` | Web Push server-side. MVP não tem. |
| 11 | `lib/admin-auth.ts` | Auth admin. MVP não tem admin. |
| 12 | `lib/admin-users-cache.ts` | Cache admin. MVP não tem admin. |
| 13 | `lib/auth-guard-logic.ts` | Lógica extra de auth guard. Redundante com AuthGuard adaptado. |
| 14 | `lib/auth-helpers.ts` | Helpers de auth Supabase. |
| 15 | `lib/cache.ts` | Cache genérico. |
| 16 | `lib/rate-limit.ts` | Rate limiting. NestJS já tem. |
| 17 | `lib/metrics.ts` | Métricas. MVP não tem. |
| 18 | `lib/metrics-flush.ts` | Flush de métricas. |
| 19 | `lib/share.ts` | Compartilhamento social. MVP não tem. |
| 20 | `lib/db-client.ts` | Cliente DB. |
| 21-40 | `lib/repositories/*.ts` (20 arquivos) | Camada de repositório Supabase. Não aplicável. |
| 41-57 | `lib/services/notification-*.ts` (5 arquivos) | Pipeline de notificações. |
| 42 | `lib/services/challenge-service.ts` | Desafios. MVP não tem. |
| 43 | `lib/services/community-event-service.ts` | Eventos comunitários. MVP não tem. |
| 44 | `lib/services/feed-service.ts` | Feed social. MVP não tem. |
| 45 | `lib/services/friendship-service.ts` | Amigos. MVP não tem. |
| 46 | `lib/services/group-service.ts` | Grupos. MVP não tem. |
| 47 | `lib/services/leaderboard-service.ts` | Ranking. MVP não tem. |
| 48 | `lib/services/referral-service.ts` | Referidos. MVP não tem. |
| 49 | `lib/services/dashboard-service.ts` | RPC agregada Supabase. NestJS não tem endpoint equivalente. |
| 50 | `lib/services/onboarding-service.ts` | Onboarding via Supabase. Não existe no NestJS. |
| 51 | `lib/services/profile-service.ts` | Perfil via Supabase. Kairos tem `/profile`. |
| 52 | `lib/services/insight-service.ts` | Insights via Supabase. Kairos tem `/insights`. |
| 53 | `lib/services/streak-service.ts` | Streak via Supabase. NestJS tem `/habits/streak`. |
| 54-76 | `app/api/**` (23 diretórios) | API Routes Next.js. NestJS já cobre os endpoints necessários. |
| 77 | `app/amigos/page.tsx` | Social. MVP não tem. |
| 78 | `app/feed/page.tsx` | Social. MVP não tem. |
| 79 | `app/ranking/page.tsx` | Social. MVP não tem. |
| 80 | `app/desafios/page.tsx` | Social. MVP não tem. |
| 81 | `app/grupos/page.tsx` | Social. MVP não tem. |
| 82 | `app/planos/page.tsx` | Planos pagos. MVP não tem. |
| 83 | `app/admin/page.tsx` | Admin. MVP não tem. |
| 84 | `app/u/[username]/page.tsx` | Perfil público. MVP não tem. |
| 85 | `components/NotificationInit.tsx` | Push notifications. MVP não tem. |
| 86 | `components/PwaInstallListener.tsx` | PWA install. MVP não tem. |
| 87 | `components/SwRegistrar.tsx` | Service Worker. MVP não tem. |
| 88 | `capacitor.config.ts` | Mobile. MVP não tem. |
| 89 | `ecosystem.config.js` | PM2. MVP não tem. |
| 90 | `render.yaml` | Deploy Render. MVP não tem. |
| 91 | `setup-services.ps1` | Setup script. |
| 92 | `test-api.mjs` | Test script. |
| 93 | `scripts/` | Scripts diversos. |

**Total: ~67 arquivos para descartar**

---

## 7. Estimativa Real de Economia de Tempo

### Cenário A: Escrever do zero (sem reaproveitar nada)

| Item | Horas |
|---|---|
| Design system (CSS 450 linhas + Tailwind config 100 linhas) | 8h |
| 6 componentes UI puros | 6h |
| 5 componentes utilitários (EmptyState, Skeleton, ErrorCard, ErrorBoundary, ConfirmDialog) | 4h |
| Layout (AppShell + Sidebar + BottomNav) | 8h |
| Auth (Provider + Guard + Login page) | 6h |
| Dashboard | 12h |
| Pomodoro | 8h |
| Página de Hábitos | 6h |
| Store Zustand | 3h |
| Lib utils (logger, fetch-with-timeout, toast) | 2h |
| IntroScreen + animações | 3h |
| **Total** | **66h** (~8.25 dias) |

### Cenário B: Reaproveitar (plano recomendado)

| Item | Ação | Horas |
|---|---|---|
| `globals.css` + `tailwind.config.ts` | Copiar sem alteração | 0.5h |
| 6 componentes UI | Copiar sem alteração | 0.5h |
| 5 componentes utilitários | Copiar sem alteração | 0.5h |
| `fetch-with-timeout.ts` + `toast.ts` + `logger.ts` | Copiar sem alteração | 0.5h |
| `level-service.ts` | Copiar sem alteração | 0h |
| `BackgroundParticles.tsx` + `AmbientSound.tsx` | Copiar sem alteração | 0h |
| `AppShell.tsx` | Adaptar imports | 0.5h |
| `Sidebar.tsx` | Adaptar navItems + remover admin check + trocar useAuth | 2h |
| `BottomNav.tsx` | Adaptar navItems + trocar useAuth | 1h |
| `IntroScreen.tsx` | Adaptar health check endpoint | 1h |
| `AuthProvider.tsx` | Reescrever para JWT | 3h |
| `AuthGuard.tsx` | Adaptar (remover Supabase checks) | 1.5h |
| `app/login/page.tsx` | Adaptar useAuth (interface igual) | 1.5h |
| `store/useStore.ts` | Adaptar tipos + adicionar token | 2h |
| `lib/api.ts` | Adicionar interceptor JWT | 1h |
| `middleware.ts` | Adaptar | 1h |
| `app/page.tsx` (Dashboard) | Adaptar data layer | 6h |
| `app/pomodoro/page.tsx` | Adaptar persistência | 3h |
| `app/progresso/page.tsx` | Adaptar data layer | 3h |
| `app/habits/page.tsx` (novo) | Usar UI de livros como referência | 4h |
| `lib/gamification.ts` | Adaptar | 1h |
| `lib/services/achievement-service.ts` | Extrair definições | 1h |
| `components/Achievements.tsx` | Adaptar | 2h |
| **Total** | | **42h** (~5.25 dias) |

### Economia

| Métrica | Valor |
|---|---|
| Economia de tempo | **~24h** (~3 dias) |
| % de economia | **~36%** |
| Arquivos copiados sem alteração | **19** |
| Arquivos adaptados | **19** |
| Arquivos descartados | **~67** |

> **Nota sobre a estimativa anterior:** A estimativa anterior de 58% de economia foi revisada para baixo após leitura exaustiva. A adaptação do Dashboard (`app/page.tsx`) é mais complexa do que inicialmente estimado — o hook `useDashboardData` faz 5+ chamadas `dataFetch` a tabelas Supabase que não têm equivalente direto nos endpoints NestJS. Cada chamada precisa ser remapeada individualmente.

---

## 8. Estratégia de Migração de Menor Risco

### Princípios

1. **Copiar primeiro, adaptar depois** — Mover arquivos puros (zero dependência) antes de tocar em qualquer arquivo com dependência Supabase
2. **Camada de dados por último** — Só adaptar páginas quando `api.ts` e `AuthProvider` estiverem funcionando
3. **Um lote por vez** — Validar com `next build` e `next dev` antes de avançar
4. **Não quebrar o que funciona** — O monorepo atual tem uma landing page que renderiza. Cada lote deve manter isso verdadeiro.

### Ordem de Lotes (menor → maior risco)

#### Lote 1: Fundação estática (risco: zero)
**Arquivos:** `globals.css`, `tailwind.config.ts`
**Ação:** Copiar do antigo, substituir no monorepo
**Validação:** `pnpm dev --filter web` — página inicial renderiza com dark theme

#### Lote 2: Componentes UI puros (risco: zero)
**Arquivos:** 6 componentes em `components/ui/` + `EmptyState`, `Skeleton`, `ErrorCard`, `ErrorBoundary`, `ConfirmDialog`
**Ação:** Criar estrutura de pastas, copiar arquivos
**Dependências a instalar:** `lucide-react`, `date-fns`
**Validação:** `next build` sem erros

#### Lote 3: Utils puros (risco: zero)
**Arquivos:** `fetch-with-timeout.ts`, `toast.ts`, `logger.ts`, `BackgroundParticles.tsx`, `AmbientSound.tsx`, `level-service.ts`
**Ação:** Copiar
**Dependências a instalar:** `react-hot-toast`, `clsx`, `tailwind-merge`
**Validação:** `next build` sem erros

#### Lote 4: Auth (risco: médio)
**Arquivos:** `AuthProvider.tsx` (reescrever), `AuthGuard.tsx` (adaptar), `lib/auth.ts` (novo), `app/login/page.tsx` (adaptar)
**Ação:** Criar `lib/auth.ts` com gestão JWT em localStorage; reescrever `AuthProvider` para chamar `/api/auth/login` e `/api/auth/register`; adaptar `AuthGuard` removendo checks Supabase; adaptar tela de login
**Pré-requisito:** API NestJS rodando em localhost:4000
**Validação:** Login real funciona, token armazenado, redirect para `/`

#### Lote 5: Store + API client (risco: médio)
**Arquivos:** `store/appStore.ts` (adaptar), `lib/api.ts` (enriquecer)
**Ação:** Adaptar store com tipos do Prisma + campo `token`; enriquecer `api.ts` com interceptor JWT
**Validação:** Store persiste entre reloads; API envia header `Authorization`

#### Lote 6: Layout shell (risco: baixo)
**Arquivos:** `AppShell.tsx`, `Sidebar.tsx` (adaptar), `BottomNav.tsx` (adaptar)
**Ação:** Adaptar nav items; remover admin check; trocar useAuth
**Validação:** Navegação funcional entre rotas

#### Lote 7: Root layout + Intro (risco: baixo)
**Arquivos:** `app/layout.tsx` (reescrever), `IntroScreen.tsx` (adaptar)
**Ação:** Integrar providers no root layout; adaptar health check
**Validação:** App inicia com intro, redireciona corretamente

#### Lote 8: Dashboard (risco: alto)
**Arquivos:** `app/page.tsx` (adaptar), `hooks/useDashboardData.ts` (novo)
**Ação:** Extrair hook do dashboard; remapear todas as chamadas para endpoints NestJS
**Validação:** Dashboard carrega dados reais

#### Lote 9: Hábitos (risco: médio)
**Arquivos:** `app/habits/page.tsx` (novo)
**Ação:** Nova página baseada na UI de `app/livros/page.tsx`, adaptada para `/api/habits`
**Validação:** CRUD de hábitos funciona

#### Lote 10: Pomodoro (risco: médio)
**Arquivos:** `app/pomodoro/page.tsx` (adaptar)
**Ação:** Adaptar timer; remover `dataFetch` para `pomodoro_sessions` (não existe no NestJS — usar localStorage ou pular persistência)
**Validação:** Timer funcional

---

## 9. Dependências Necessárias no `apps/web/package.json`

| Dependência | Versão antiga | Já no monorepo? | Ação |
|---|---|---|---|
| `lucide-react` | `^0.400.0` | ❌ | Adicionar |
| `date-fns` | `^3.6.0` | ❌ | Adicionar |
| `clsx` | `^2.1.1` | ❌ | Adicionar |
| `tailwind-merge` | `^2.4.0` | ❌ | Adicionar |
| `react-hot-toast` | `^2.4.1` | ❌ | Adicionar |
| `zustand` | `^4.5.4` | ✅ `^4.5.0` | OK |
| `@tanstack/react-query` | — | ✅ `^5.50.0` | OK |
| `next` | `14.2.5` | ✅ `^14.2.0` | OK |
| `tailwindcss` | `3.4.6` | ✅ `^3.4.0` | OK |
| `zod` | `^4.4.3` | ❌ | Adicionar (opcional) |
| `@capacitor/core` | `^8.3.4` | ❌ | Não adicionar no MVP |
| `@supabase/ssr` | `^0.4.0` | ❌ | Não adicionar |
| `@supabase/supabase-js` | `^2.44.2` | ❌ | Não adicionar |

---

## 10. Resumo Final

| Categoria | Quantidade |
|---|---|
| Arquivos copiados sem alteração | **19** |
| Arquivos adaptados | **19** |
| Arquivos descartados | **~67** |
| Total de arquivos na versão antiga | **~105** (estimativa) |
| Economia estimada | **~24h (~3 dias)** |
| Lotes de implementação | **10** |
| Novas dependências | **5** (`lucide-react`, `date-fns`, `clsx`, `tailwind-merge`, `react-hot-toast`) |

**Risco principal:** A adaptação do Dashboard (Lote 8) é o ponto de maior complexidade, pois o hook `useDashboardData` (linhas 24-140 de `app/page.tsx`) faz chamadas a 9 tabelas Supabase diferentes que precisam ser remapeadas para endpoints NestJS que não têm o mesmo formato de retorno.
