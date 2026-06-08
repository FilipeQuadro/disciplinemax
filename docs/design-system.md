# DisciplinaMax — Design System

## Color System

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0B0E14` | Page background |
| `--bg-secondary` | `#111520` | Secondary sections |
| `--bg-sidebar` | `#0D1018` | Sidebar background |
| `--bg-card` / `--surface` | `#141820` | Card surfaces |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#F0F0F0` | Headings, primary text |
| `--text-secondary` | `#6B7585` | Secondary text, dates |
| `--text-muted` / `--text-dim` | `#8B95A5` | Muted labels, descriptions |

### Brand (Gold)
| Token | Value | Usage |
|-------|-------|-------|
| `--gold` | `#D4AF37` | Primary brand color |
| `--gold-light` | `#F5D060` | Hover states, gradients |
| `--gold-dark` | `#A8892B` | Gradient start |
| `--gold-glow` | `rgba(212,175,55,0.15)` | Glow effects |
| `--gold-border` | `rgba(212,175,55,0.2)` | Gold borders |

### Semantic
| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#3ABAB4` | Success states, goal met |
| `--warning` | `#E8844A` | Warning, streaks |
| `--danger` | `#D94F4F` | Error, destructive actions |

### Accent
| Token | Value | Usage |
|-------|-------|-------|
| `--accent-purple` | `#7C6BBD` | Books, insights |
| `--accent-teal` | `#3ABAB4` | Feed, groups, success |
| `--accent-orange` | `#E8844A` | Streak, pomodoro |
| `--accent-red` | `#D94F4F` | Destructive, timer |

### Tailwind Aliases
- `brand-{50-900}` — Gold palette
- `accent-{purple,teal,orange,red,gold}` — Accent colors
- `dark-{300-900}` — Dark palette
- `surface` → `#141820`
- `success` → `#3ABAB4`
- `warning` → `#E8844A`
- `danger` → `#D94F4F`

---

## Typography

### Font Families
| Class | Family | Usage |
|-------|--------|-------|
| `font-sans` | Inter | Body text, UI |
| `font-serif` | Playfair Display | Page titles, headings |
| `font-mono` | JetBrains Mono | Code, numbers |

### Scale
| Level | Classes | Usage |
|-------|---------|-------|
| Display | `text-3xl font-serif font-bold` | Hero stats |
| Heading | `text-2xl font-serif font-bold text-white` | Page titles (standard) |
| Subheading | `text-lg font-serif font-semibold` | Section titles |
| Body | `text-sm` | Regular text |
| Caption | `text-xs uppercase tracking-wider` | Labels, timestamps |
| Micro | `text-[10px] uppercase tracking-[0.15em]` | Section dividers |

### Gradient Text
- `.gradient-text-gold` — Gold gradient on text
- `.gradient-text-cool` — Purple gradient on text

---

## Spacing

### Tokens
| Token | Value | Tailwind |
|-------|-------|----------|
| `--space-1` | 4px | `p-1` |
| `--space-2` | 8px | `p-2` |
| `--space-3` | 12px | `p-3` |
| `--space-4` | 16px | `p-4` |
| `--space-5` | 20px | `p-5` |
| `--space-6` | 24px | `p-6` |
| `--space-8` | 32px | `p-8` |
| `--space-10` | 40px | `p-10` |
| `--space-12` | 48px | `p-12` |
| `--space-16` | 64px | `p-16` |

### Page Layout
- Root: `space-y-6`
- Cards: `p-4` or `p-5`
- Content area: `p-4 md:p-6 lg:p-8`
- Max-width: `max-w-4xl` (standard), `max-w-2xl` (settings/forms)

---

## Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--radius-sm` | 8px | `rounded-sm` | Small elements, badges |
| `--radius-md` | 12px | `rounded-md` | Buttons, inputs |
| `--radius-lg` | 16px | `rounded-lg` | Cards |
| `--radius-xl` | 20px | `rounded-xl` | Large cards, modals |
| `--radius-2xl` | 24px | `rounded-2xl` | Hero cards |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.2)` | Subtle elevation |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.25)` | Cards |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.3)` | Modals, popovers |
| `--shadow-xl` | `0 12px 40px rgba(0,0,0,0.4)` | Login card |

---

## Motion

### Durations
| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Hover, focus transitions |
| `--duration-normal` | 200ms | Standard transitions |
| `--duration-slow` | 300ms | Page enters, modals |

### Easing
| Token | Value |
|-------|-------|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |

### Animation Classes
| Class | Usage |
|-------|-------|
| `.page-enter` | Page entrance (fade + slide up) |
| `.stagger-children` | Staggered child animations |
| `.shimmer` | Gold shimmer sweep |
| `.glow-border` | Gold glow on hover |
| `.count-up` | Scale pop on value change |
| `.animate-slide-up` | Simple slide up |
| `.pulse-glow` | Pulsing gold glow |

### Rules
- **Maximum duration**: 300ms
- **Forbidden**: Infinite loops, particles, parallax, heavy blur, scroll-jacking
- **Must respect**: `prefers-reduced-motion` — all animations disabled when user prefers reduced motion

---

## Component Catalog

### Buttons
| Class | Usage |
|-------|-------|
| `.btn-primary` | Primary action (gold gradient) |
| `.btn-ghost` | Secondary action (transparent) |
| `.btn-danger` | Destructive action (red tint) |

### Cards
| Class | Usage |
|-------|-------|
| `.glass` | Base glass effect |
| `.card` | Glass + rounded + padding |
| `.card-gold` | Gold-tinted gradient card |
| `.card-purple` | Purple-tinted gradient card |
| `.card-teal` | Teal-tinted gradient card |
| `.card-orange` | Orange-tinted gradient card |
| `.card-red` | Red-tinted gradient card |

### Form Elements
| Class | Usage |
|-------|-------|
| `.input` | Text inputs |
| `.label` | Field labels |
| `.badge` | Inline badges |

### Navigation
| Class | Usage |
|-------|-------|
| `.nav-item` | Sidebar nav link |
| `.nav-item.active` | Active nav link |

### UI Components (`components/ui/`)
| Component | Usage |
|-----------|-------|
| `<HeroHeader>` | Page header with date + title + icon |
| `<GoalBadge>` | Goal met/miss indicator |
| `<ProgressRing>` | SVG circular progress |
| `<StatCard>` | Metric display card |
| `<GradientCard>` | Colored gradient card |
| `<Badge>` | Status/type badge |

### Existing Components
| Component | Usage |
|-----------|-------|
| `<EmptyState>` | Empty data display |
| `<ErrorCard>` | Error with retry |
| `<ConfirmDialog>` | Confirmation modal |
| `<Skeleton>` variants | Loading states |

---

## Accessibility Rules

1. **Contrast**: Minimum 4.5:1 (WCAG AA)
2. **Focus visible**: Gold outline ring on all interactive elements
3. **Keyboard navigation**: All interactive elements reachable via Tab
4. **Touch targets**: Minimum 44x44px
5. **ARIA labels**: Required on icon-only buttons and links
6. **Reduced motion**: All animations disabled via `prefers-reduced-motion`
7. **Skip-to-content**: Available for keyboard users
8. **`aria-live`**: Required for dynamic content updates
