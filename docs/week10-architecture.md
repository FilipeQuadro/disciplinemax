# Week 10 — Performance, Scalability & Production Polish

## Summary

This week focused on reducing request count, eliminating N+1 queries, adding caching at multiple layers, and improving observability — all while maintaining zero TypeScript errors, 711 passing tests, and a clean build.

---

## Changes Made

### Stage 1 — Database Migrations

| File | Description |
|------|-------------|
| `supabase/migrations/011_composite_indexes.sql` | 5 new composite indexes targeting hot query paths |
| `supabase/migrations/012_dashboard_rpc.sql` | `get_dashboard_data(p_user_id)` function — replaces 10+ client fetches with 1 RPC |
| `supabase/migrations/013_gamification_rpc.sql` | `compute_gamification_state(p_user_id)` function — replaces 7 separate queries with 1 RPC |

**New Indexes:**
- `idx_product_events_type_created` on `product_events(event_type, created_at DESC)`
- `idx_user_challenges_user_week` on `user_challenges(user_id, week_key, completed)`
- `idx_books_user_created` on `books(user_id, created_at ASC)`
- `idx_bible_readings_user_today` on `bible_readings(user_id, read_at DESC) WHERE read_at >= CURRENT_DATE`
- `idx_user_profiles_total_xp` on `user_profiles(total_pages DESC) WHERE is_public = true`
- `idx_notification_queue_scheduled` on `notification_queue(status, scheduled_for) WHERE status = 'pending'`

### Stage 2 — Dashboard RPC Integration

| File | Description |
|------|-------------|
| `lib/repositories/dashboard-repository.ts` | **NEW** — DashboardRepository calling `get_dashboard_data` RPC |
| `lib/services/dashboard-service.ts` | **NEW** — DashboardService wrapping repository |
| `app/api/dashboard/route.ts` | **NEW** — API route `/api/dashboard?userId=` with Zod validation |
| `app/page.tsx` | Modified `useDashboardData` hook: tries RPC first, falls back to original multi-fetch |

**Key design:** `loadViaRpc()` attempts the single RPC call. If it fails (RPC not deployed, network error), `loadViaDataFetch()` runs the original 4-phase multi-fetch as fallback. Verse and motivation are always loaded separately (they call external AI API).

### Stage 3 — Gamification Batch RPC

| File | Description |
|------|-------------|
| `app/api/gamification/route.ts` | Replaced `computeAchievementState` (5 queries) + `computeChallengeState` (3 queries) with single `compute_gamification_state` RPC call. Falls back to individual queries on RPC failure. Batched feed events via `Promise.all`. Batched achievement XP bonus (1 `addXp` instead of loop). |

**Query reduction:** 30+ queries → 3-5 queries per gamification action (RPC path) or 7-8 queries (fallback path).

### Stage 4 — Cache & HTTP Headers

| File | Description |
|------|-------------|
| `next.config.mjs` | Replaced blanket `no-cache, no-store` with selective caching: `/_next/static` = 1yr immutable, `/api/leaderboard` = 60s SWR, `/api/feed` = 30s SWR, `/api/dashboard` = 30s SWR, pages = `must-revalidate` |
| `lib/cache.ts` | Added 4 new cache namespaces: `leaderboard` (60s), `feed` (30s), `public_profile` (2min), `dashboard` (30s) |
| `app/api/leaderboard/route.ts` | Added `ApplicationCacheService.getOrSet` with 60s TTL |
| `lib/data-fetch.ts` | Added session token cache (4 min TTL) to avoid `getSession()` on every call. Exported `invalidateSessionCache()` for sign-out. |

### Stage 5 — Cursor Pagination

| File | Description |
|------|-------------|
| `app/api/feed/route.ts` | Added Zod validation, `cursor` parameter, returns `nextCursor` for pagination |
| `lib/services/feed-service.ts` | Added `cursor` parameter to `getFeed()` |
| `lib/repositories/feed-repository.ts` | Added `cursor` parameter to `getFriendsFeed()` and `getUserFeed()` — uses `query.lt("created_at", cursor)` |

### Stage 6 — Zustand Selectors & Fixes

| File | Description |
|------|-------------|
| `store/useStore.ts` | Fixed `clearUserData()` to also reset `sidebarOpen` and `notificationsEnabled` |
| `app/progresso/page.tsx` | Changed `const { streak } = useStore()` → `const streak = useStore(s => s.streak)` |
| `components/Achievements.tsx` | Same selector pattern |
| `app/onboarding/page.tsx` | Same selector pattern |
| `components/AuthProvider.tsx` | Same selector pattern |

### Stage 7 — Observability & Code-Splitting

| File | Description |
|------|-------------|
| `components/AppShell.tsx` | Sidebar loaded via `next/dynamic` with `ssr: false` |
| `app/layout.tsx` | BackgroundParticles loaded via `next/dynamic` with `ssr: false` |
| `app/api/health/route.ts` | Added `Server-Timing` header to detailed health response |

### Stage 8 — Tests

| File | Description |
|------|-------------|
| `tests/unit/dashboard-repository.test.ts` | **NEW** — 7 tests (DashboardRepository + DashboardService) |
| `tests/unit/feed.test.ts` | Updated for cursor pagination signature |
| `tests/integration/feed.test.ts` | Updated for Zod validation + cursor pagination |
| `tests/integration/leaderboard.test.ts` | Added ApplicationCacheService mock |

---

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit --strict`) | ✅ Zero errors |
| ESLint (`next lint`) | ✅ Zero warnings |
| Tests (`vitest run`) | ✅ 711/711 passing |
| Build (`next build`) | ✅ Clean |
| Dynamic Routes Warnings | ✅ None (feed + leaderboard + dashboard = force-dynamic) |
| React Hook Warnings | ✅ None |

---

## Performance Impact (Estimated)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Dashboard: requests per load | 10-12 | 1-2 (RPC path) | **-85%** |
| Dashboard: DB round trips | 10-12 | 1 | **-90%** |
| Gamification: queries per action | 30+ | 3-5 (RPC path) | **-85%** |
| Session token lookups per page | N per dataFetch | 1 (cached 4min) | **-95%** |
| Leaderboard: cache hit rate | 0% | ~80% (60s TTL) | +80% |
| Static assets caching | No cache | 1yr immutable | CDN-cacheable |
| BackgroundParticles bundle | Loaded eagerly | Deferred | -15KB initial JS |
| Sidebar bundle | Loaded eagerly | Deferred | -8KB initial JS |
