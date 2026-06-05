# Week 7 — Success Metrics: Engagement, Gamification & Retention

## Feature Summary

Week 7 introduces a complete gamification layer with 5 interconnected systems:
- **Streak System**: Daily activity tracking with freeze protection
- **XP & Level System**: 8 action types with progressive level formula
- **Achievement System**: 10 essential achievements across 5 categories
- **Challenge System**: 12 rotating weekly challenges (3 per week)
- **Insights Engine**: 6 insight types for personalized feedback

## Expected Impact (30-day horizon)

| Metric | Baseline (pre-W7) | Target (30 days) | Measurement |
|--------|-------------------|------------------|-------------|
| **DAU/MAU ratio** | ~25% | ≥35% | Daily active / Monthly active users |
| **Session frequency** | 2.3 sessions/week | ≥3.5 sessions/week | Avg sessions per user per week |
| **Goal completion rate** | ~40% of days | ≥55% of days | % of days with `goals_completed=true` |
| **Streak retention (7d)** | N/A (no streak tracking) | ≥30% of users maintain 7d streak | `user_streaks.current_streak >= 7` |
| **XP engagement** | N/A | ≥80% of DAU earn XP daily | Users with `xp_events` today / DAU |
| **Achievement unlock rate** | N/A | ≥60% of users unlock ≥3 achievements | `user_achievements.completed >= 3` |
| **Challenge participation** | N/A | ≥50% of users complete ≥1 challenge/week | `user_challenges.completed=true` this week |
| **Progress Center visits** | N/A | ≥25% of DAU visit `/progresso` | Page view events for `/progresso` |

## Key Indicators by System

### Streak System
- **Primary**: % of active users with streak ≥ 3 (target: 40%)
- **Secondary**: Streak freeze usage rate (indicates engagement with the mechanic)
- **Risk**: Break rate without freeze (indicates retention gap)

### XP & Level
- **Primary**: Average XP per user per day (target: ≥30 XP/day)
- **Secondary**: Level distribution — are users progressing beyond level 3?
- **Risk**: XP inflation — are rewards balanced? (Level 10 requires 10,000 XP)

### Achievements
- **Primary**: Time to first achievement (target: ≤3 days)
- **Secondary**: Achievement distribution — are all categories being unlocked?
- **Risk**: Dead achievements — any with <5% unlock rate after 30 days

### Challenges
- **Primary**: Weekly challenge completion rate (target: ≥30%)
- **Secondary**: Challenge difficulty balance — completion % by challenge type
- **Risk**: Challenge fatigue — do engagement rates drop after initial weeks?

### Insights
- **Primary**: Insight relevance — do users act on streak risk insights?
- **Secondary**: Best study hour accuracy — correlation with actual session times
- **Risk**: Insight fatigue — too many insights reducing perceived value

## Gamification Economy

| Action | XP Reward | Daily Max (typical) | Weekly Max |
|--------|-----------|--------------------|------------|
| Page read | 2 XP/page | ~40 XP (20 pages) | ~280 XP |
| Pomodoro completed | 10 XP | ~40 XP (4 pomos) | ~280 XP |
| Bible chapter | 5 XP | ~15 XP (3 chapters) | ~105 XP |
| Goal completed | 25 XP | ~25 XP | ~175 XP |
| Streak day | 5 XP | ~5 XP | ~35 XP |
| Achievement unlocked | 50 XP | Variable | Variable |
| Challenge completed | 30 XP | Variable | ~90 XP (3 challenges) |
| Book finished | 100 XP | Variable | Variable |

**Typical active user**: ~125 XP/day → Level 5 in ~8 weeks
**Level progression**: Level 1→2 (100 XP), Level 2→3 (300 XP), Level 5→6 (2,000 XP), Level 10 (10,000 XP total)

## Anti-Patterns Mitigated

1. **No XP farming**: XP is tied to real actions (page reads, pomodoro completions) with DB-verified counts
2. **No streak gaming**: Streak requires actual daily activity, validated by cron
3. **No achievement spam**: Only 10 curated achievements, not 20+
4. **No challenge overwhelm**: Max 3 active challenges per week, rotating selection
5. **No notification fatigue**: Insights generated daily but only 3 shown at a time
