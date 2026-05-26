export type PlanType = "free" | "pro" | "premium";

export const PLAN_LIMITS: Record<PlanType, {
  maxBooks: number;
  maxPomodorosPerDay: number;
  weeklyReport: boolean;
  ambientSounds: number;
  aiMotivationPerDay: number;
  streakFreezePerMonth: number;
  label: string;
  price: string;
  color: string;
}> = {
  free: {
    maxBooks: Infinity,
    maxPomodorosPerDay: Infinity,
    weeklyReport: true,
    ambientSounds: 3,
    aiMotivationPerDay: Infinity,
    streakFreezePerMonth: Infinity,
    label: "Free",
    price: "R$ 0",
    color: "#8B95A5",
  },
  pro: {
    maxBooks: Infinity,
    maxPomodorosPerDay: Infinity,
    weeklyReport: true,
    ambientSounds: 3,
    aiMotivationPerDay: Infinity,
    streakFreezePerMonth: Infinity,
    label: "Pro",
    price: "R$ 14,90/mês",
    color: "#7C6BBD",
  },
  premium: {
    maxBooks: Infinity,
    maxPomodorosPerDay: Infinity,
    weeklyReport: true,
    ambientSounds: 3,
    aiMotivationPerDay: Infinity,
    streakFreezePerMonth: Infinity,
    label: "Premium",
    price: "R$ 29,90/mês",
    color: "#D4AF37",
  },
};

export function getLimit(plan: PlanType, feature: keyof typeof PLAN_LIMITS.free) {
  return PLAN_LIMITS[plan][feature];
}

export function canDoAction(plan: PlanType, feature: "maxBooks" | "maxPomodorosPerDay" | "aiMotivationPerDay" | "streakFreezePerMonth", current: number): boolean {
  const limit = PLAN_LIMITS[plan][feature] as number;
  return current < limit;
}
