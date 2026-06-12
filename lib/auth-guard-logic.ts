/**
 * Pure decision logic extracted from AuthGuard for testability.
 * The component still renders via its existing if-chain — this module
 * is only used by tests to verify the guard state transitions.
 */

export type GuardState =
  | "timeout"
  | "loading"
  | "public"
  | "unauthenticated"
  | "onboarding"
  | "blocked"
  | "authenticated";

export interface GuardParams {
  user: object | null;
  loading: boolean;
  timedOut: boolean;
  blocked: boolean;
  isPublic: boolean;
  isOnboarding: boolean;
}

export function getGuardState(params: GuardParams): GuardState {
  const { user, loading, timedOut, blocked, isPublic, isOnboarding } = params;

  if (timedOut && !user) return "timeout";
  if (loading) return "loading";
  if (isPublic) return "public";
  if (!user) return "unauthenticated";
  if (isOnboarding) return "onboarding";
  if (blocked) return "blocked";
  return "authenticated";
}

export function shouldRedirectToLogin(params: {
  loading: boolean;
  timedOut: boolean;
  user: object | null;
  isPublic: boolean;
  isOnboarding: boolean;
}): boolean {
  return !params.loading && !params.timedOut && !params.user && !params.isPublic && !params.isOnboarding;
}

export function shouldRedirectToHome(params: {
  loading: boolean;
  timedOut: boolean;
  user: object | null;
  isPublic: boolean;
}): boolean {
  return !params.loading && !params.timedOut && !!params.user && params.isPublic;
}
