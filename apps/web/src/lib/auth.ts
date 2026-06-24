const TOKEN_KEY = "disciplina_token";
const USER_KEY = "disciplina_user";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.message) {
    return Array.isArray(data.message) ? data.message[0] : data.message;
  }
  return `Erro ${res.status}: ${res.statusText}`;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error(await parseError(res));

  return res.json();
}

export async function register(
  email: string,
  name: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
  });

  if (!res.ok) throw new Error(await parseError(res));

  return res.json();
}
