import { useSyncExternalStore } from "react";
import { api } from "./api";
import { getSession, setSession, subscribe, type Session } from "./session";
import type { AuthResponse } from "./types";

/**
 * The current session:
 *   undefined = we have not looked in localStorage yet (server render / first paint)
 *   null      = signed out
 *   Session   = signed in
 */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, getSession, () => undefined);
}

const RETURN_KEY = "fitness.returnPath";

/**
 * Someone opening an invite link while signed out must land back on that invite
 * after signing in, so the guard remembers the path. Only invite links count.
 */
export function rememberReturnPath(path: string) {
  if (!path.startsWith("/join/")) return;
  try {
    window.sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    // Storage blocked: they simply land on the dashboard after signing in.
  }
}

export function takeReturnPath(): string {
  try {
    const path = window.sessionStorage.getItem(RETURN_KEY);
    window.sessionStorage.removeItem(RETURN_KEY);
    if (path?.startsWith("/join/")) return path;
  } catch {
    // See above.
  }
  return "/";
}

/** Permanently deletes the account everywhere, then signs out here. */
export async function deleteAccount(password: string): Promise<void> {
  await api("/account/delete", { method: "POST", body: { password } });
  setSession(null);
}

function save(data: AuthResponse) {
  setSession({ access: data.access_token, refresh: data.refresh_token, user: data.user });
}

export async function login(email: string, password: string): Promise<void> {
  save(await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false }));
}

export async function register(name: string, email: string, password: string): Promise<void> {
  save(await api<AuthResponse>("/auth/register", { method: "POST", body: { name, email, password }, auth: false }));
}

export async function logout(): Promise<void> {
  const session = getSession();
  setSession(null); // sign out in the UI right away
  if (!session) return;
  try {
    // Tell the server to revoke the refresh token so it cannot be reused.
    await api("/auth/logout", { method: "POST", body: { refresh_token: session.refresh }, auth: false });
  } catch {
    // Best effort: the user is already signed out locally.
  }
}
