// Everything the frontend knows about the backend lives in this file.
//
// The browser talks to ONE address: the gateway. It never contacts the auth,
// workout or nutrition services directly (they are not even reachable from
// outside Docker). The gateway decides which service handles each request.

import { getSession, setSession } from "./session";
import type { AuthResponse } from "./types";

// Baked in when the app is built (NEXT_PUBLIC_ variables are public by design).
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number; // HTTP status, or 0 when the server could not be reached at all
  code: string; // machine-readable, e.g. "validation_error"
  details?: Record<string, string>; // per-field messages for validation errors

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** A human-readable message for any error, including field-level details. */
export function messageOf(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.details ? Object.entries(err.details) : [];
    if (details.length === 0) return err.message;
    return `${err.message}: ${details.map(([field, problem]) => `${field} ${problem}`).join("; ")}`;
  }
  return "Something went wrong. Please try again.";
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // false for login/register/refresh (default true)
};

async function send(path: string, options: Options, accessToken: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  try {
    return await fetch(`${API_URL}/api/v1${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network_error", "Cannot reach the server. Is the backend running?");
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(res.status, body.code ?? "error", body.message ?? res.statusText, body.details);
  } catch {
    return new ApiError(res.status, "error", res.statusText || "Request failed");
  }
}

/**
 * Call the API and return the parsed JSON.
 * If the access token has expired (401), it quietly gets a new one with the
 * refresh token and repeats the request once.
 */
export async function api<T = void>(path: string, options: Options = {}): Promise<T> {
  const res = await request(path, options);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function request(path: string, options: Options): Promise<Response> {
  const useAuth = options.auth ?? true;

  let res = await send(path, options, useAuth ? (getSession()?.access ?? null) : null);
  if (res.status === 401 && useAuth && (await refreshSession())) {
    res = await send(path, options, getSession()?.access ?? null);
  }

  if (!res.ok) throw await toApiError(res);
  return res;
}

/**
 * Download a file from the API. A plain link cannot send the login token, so the
 * file is fetched here and then handed to the browser to save.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const res = await request(path, {});
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

// Several requests can fail with 401 at the same moment. Refresh tokens work
// only once, so they must all share a single refresh instead of racing.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  const session = getSession();
  if (!session) return false;

  let res: Response;
  try {
    res = await send("/auth/refresh", { method: "POST", body: { refresh_token: session.refresh } }, null);
  } catch {
    return false; // server unreachable: keep the session, the user can try again
  }
  if (res.status === 401) {
    setSession(null); // the refresh token is dead: signed out for real
    return false;
  }
  if (!res.ok) return false;

  const data = (await res.json()) as AuthResponse;
  setSession({ access: data.access_token, refresh: data.refresh_token, user: data.user });
  return true;
}
