// The logged-in session (tokens + user), kept in localStorage.
//
// This is a tiny "external store": a value that lives outside React, plus a way
// to be told when it changes. React components read it with useSession()
// (see auth.ts) and re-render automatically when it changes.
//
// Trade-off worth knowing: anything in localStorage can be read by JavaScript
// running on the page, so a cross-site-scripting bug would expose the tokens.
// Production web apps often keep the refresh token in an httpOnly cookie
// instead. A mobile app would use the platform's secure storage.

import type { User } from "./types";

export type Session = { access: string; refresh: string; user: User };

const STORAGE_KEY = "fitness.session";

const listeners = new Set<() => void>();
let current: Session | null | undefined; // undefined = not read from storage yet
let listeningToOtherTabs = false;

function readStorage(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.access && parsed?.refresh && parsed?.user?.id) return parsed as Session;
  } catch {
    // Storage blocked (private mode) or corrupt JSON: behave as signed out.
  }
  return null;
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSession(): Session | null {
  if (current === undefined) current = readStorage();
  return current;
}

export function setSession(next: Session | null) {
  current = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Could not persist; the session still works until the page is closed.
  }
  notify();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!listeningToOtherTabs) {
    listeningToOtherTabs = true;
    // Signing out in one tab should sign out every tab.
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        current = readStorage();
        notify();
      }
    });
  }
  return () => {
    listeners.delete(listener);
  };
}
