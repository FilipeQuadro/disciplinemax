# Week 13 — Premium SaaS Experience (FINAL)

## Status

```
WEEK_13_STATUS = APPROVED
LOCKED_FILES = 30
BATCHES = 4
PATTERNS_IMPLEMENTED = 11
```

## Objetivo

Transformar DisciplinaMax em SaaS visualmente premium. Princípios: Apple HIG, Linear, Stripe, Arc, Raycast.

Regras estritas: zero backend, zero funcionalidades novas, zero dependências novas, anti-loop obrigatório.

---

## Padrões Unificados

| # | Padrão | Antes | Depois |
|---|--------|-------|--------|
| 1 | Page spacing | `space-y-6` | `space-y-8` |
| 2 | Title/value weight | `font-bold` | `font-semibold tracking-tight` |
| 3 | Label size mínimo | `text-[9px]` | `text-[10px]` |
| 4 | Label size secundário | `text-[10px]` | `text-[11px]` |
| 5 | Section headers | `font-semibold` | `font-semibold tracking-tight` |
| 6 | Stat values | `font-bold` | `font-semibold tracking-tight` |
| 7 | Empty/Error padding | `py-12` | `py-16` |
| 8 | Empty/Error text | `max-w-xs` | `max-w-sm leading-relaxed` |
| 9 | CTA feedback | sem feedback tátil | `active:scale-[0.98] transition-transform duration-150` |
| 10 | Card hover | flat | `hover:-translate-y-px hover:shadow-lg` |
| 11 | Motion violation | `hover:scale-110` | `active:scale-[0.98]` |

---

## Batch 1 — Dashboard Core + Pages (15 arquivos)

| # | Arquivo | Mudanças |
|---|---------|----------|
| 1 | `components/ui/HeroHeader.tsx` | Icon container, tracking-tight, uppercase label, space-y-1.5 |
| 2 | `components/ui/StatCard.tsx` | Gradient bg, 2px accent bar, font-semibold, icon bg 14 |
| 3 | `app/globals.css` | stat-card hover depth, duration 300→200 |
| 4 | `app/page.tsx` | space-y-8, font-semibold tracking-tight x8 |
| 5 | `app/biblia/page.tsx` | space-y-8, font-semibold tracking-tight x6, labels |
| 6 | `app/livros/page.tsx` | space-y-8, font-semibold tracking-tight x5, labels |
| 7 | `app/progresso/page.tsx` | space-y-8, font-semibold tracking-tight x5 |
| 8 | `app/pomodoro/page.tsx` | space-y-8, font-semibold tracking-tight x4 |
| 9 | `app/ranking/page.tsx` | space-y-8, font-semibold tracking-tight x2 |
| 10 | `app/grupos/page.tsx` | section headers tracking-tight x2 |
| 11 | `app/configuracoes/page.tsx` | space-y-8, font-semibold tracking-tight x9 |
| 12 | `app/onboarding/page.tsx` | font-semibold tracking-tight title |
| 13 | `app/planos/page.tsx` | space-y-8, font-semibold tracking-tight x3 |
| 14 | `app/feed/page.tsx` | space-y-8 |
| 15 | `components/Sidebar.tsx` | font-semibold tracking-tight x3 |

## Batch 2 — Admin + Profile + Components (5 arquivos)

| # | Arquivo | Mudanças |
|---|---------|----------|
| 16 | `app/admin/page.tsx` | space-y-8, font-semibold tracking-tight x7, text-[9px]→text-[10px] x5 |
| 17 | `app/u/[username]/page.tsx` | space-y-8, font-semibold tracking-tight x2 (avatar font-bold mantido — semântico) |
| 18 | `components/Achievements.tsx` | badge label font-semibold tracking-tight |
| 19 | `components/AuthGuard.tsx` | font-serif font-semibold tracking-tight x2 |
| 20 | `components/ErrorBoundary.tsx` | font-serif font-semibold tracking-tight x1 |

## Batch 3 — Shared Components + Login (5 arquivos)

| # | Arquivo | Mudanças |
|---|---------|----------|
| 21 | `components/EmptyState.tsx` | py-16, tracking-tight, max-w-sm, leading-relaxed, mt-6 CTA, active:scale, transition |
| 22 | `components/ConfirmDialog.tsx` | tracking-tight no title, active:scale nos 2 botões |
| 23 | `components/ErrorCard.tsx` | py-16, tracking-tight, max-w-sm, leading-relaxed, mt-6 CTA, active:scale |
| 24 | `components/Skeleton.tsx` | space-y-8 em SkeletonPage + SkeletonProfile |
| 25 | `app/login/page.tsx` | aria-label x3, active:scale no submit |

## Batch 4 — Finishing Touches (5 arquivos)

| # | Arquivo | Mudanças |
|---|---------|----------|
| 26 | `components/PwaInstallListener.tsx` | hover:scale-110 → active:scale-[0.98], tracking-tight |
| 27 | `components/ui/GradientCard.tsx` | hover:-translate-y-px hover:shadow-lg |
| 28 | `components/ui/Badge.tsx` | font-medium tracking-tight |
| 29 | `components/ui/GoalBadge.tsx` | font-medium tracking-tight |
| 30 | `components/AmbientSound.tsx` | text-[10px] → text-[11px] |

---

## Métricas Finais

| Métrica | Valor |
|---------|-------|
| Arquivos alterados | 30 |
| Páginas refinadas | 14 |
| Componentes refinados | 16 |
| Padrões unificados | 11 |
| font-bold → font-semibold tracking-tight | ~40 instâncias |
| text-[9px] eliminados | 5 |
| space-y-6 → space-y-8 | 11 páginas |
| py-12 → py-16 | 3 componentes |
| active:scale adicionados | 6 botões |
| aria-label adicionados | 3 inputs |
| Motion violations corrigidas | 1 |
| `tsc --noEmit --strict` | ✅ Zero erros |
| `vitest run` | ✅ 712/712 |
| `next build` | ✅ 42/42 páginas |
| Backend tocado | Zero |
| Loop detectado | Zero |
| Dependências novas | Zero |

---

## Arquivos LOCKED (30)

1. components/ui/HeroHeader.tsx
2. components/ui/StatCard.tsx
3. app/globals.css
4. app/page.tsx
5. app/biblia/page.tsx
6. app/livros/page.tsx
7. app/progresso/page.tsx
8. app/pomodoro/page.tsx
9. app/ranking/page.tsx
10. app/grupos/page.tsx
11. app/configuracoes/page.tsx
12. app/onboarding/page.tsx
13. app/planos/page.tsx
14. app/feed/page.tsx
15. components/Sidebar.tsx
16. app/admin/page.tsx
17. app/u/[username]/page.tsx
18. components/Achievements.tsx
19. components/AuthGuard.tsx
20. components/ErrorBoundary.tsx
21. components/EmptyState.tsx
22. components/ConfirmDialog.tsx
23. components/ErrorCard.tsx
24. components/Skeleton.tsx
25. app/login/page.tsx
26. components/PwaInstallListener.tsx
27. components/ui/GradientCard.tsx
28. components/ui/Badge.tsx
29. components/ui/GoalBadge.tsx
30. components/AmbientSound.tsx

---

## Anti-Loop Rules (Permanentes)

1. Um arquivo só pode receber UMA rodada de refinamento visual por sprint
2. Arquivos LOCKED não podem ser reabertos para microajustes
3. Só reabrir se: bug funcional, acessibilidade, responsividade, quebra de Design System, erro TS
4. Máximo 5 arquivos por batch
5. Mesmo diff 2x seguidas → PARAR

---

## Referências de Design

- Apple Human Interface Guidelines
- iOS 26/27 design language
- Linear (linear.app)
- Stripe Dashboard
- Arc Browser
- Raycast
