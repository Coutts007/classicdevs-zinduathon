/**
 * The typed API client. Types come from backend/openapi.yaml (src/lib/api/schema.d.ts).
 *
 * Middleware:
 *  1. Authorization: Bearer <access> and X-Request-ID on every request.
 *  2. On 401 (token_invalid / not_authenticated) with a refresh token: ONE shared refresh call
 *     for all concurrent requests, then each original request is retried once. If the refresh
 *     token is rejected, tokens are cleared and sessionEvents.ended() fires; if the refresh is
 *     only unavailable (429, 5xx, offline), the session is kept.
 */
import createClient, { type Middleware } from "openapi-fetch";

import { sessionEvents, tokens, type TokenPair } from "@/lib/auth/tokens";
import { env } from "@/lib/env";

import { toApiError } from "./errors";
import type { paths } from "./schema";

export const API_BASE_URL: string = env.apiBaseUrl;
// Paths in the schema include the /api/v1 prefix, so the client's base is the origin.
const ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/token/refresh", "/auth/github/callback"];
const pending = new Map<string, Request>(); // request id → untouched clone, for one retry

/**
 * "invalid": the refresh token is dead (sign in again). "unavailable": rate-limited, server error
 * or offline: keep the session and try later, never sign the user out for it.
 */
export type RefreshResult = "ok" | "invalid" | "unavailable";
let refreshing: Promise<RefreshResult> | null = null;
let retryAfterMs = 0;

/** Seconds from the last 429's Retry-After (capped at 10 s), for callers that back off. */
export const lastRetryAfterMs = () => retryAfterMs;

/** Exchange the refresh token. Single-flight: concurrent callers share one network call. */
export function refreshSession(fetchImpl: typeof fetch = fetch): Promise<RefreshResult> {
  const refresh = tokens.refresh();
  if (!refresh) return Promise.resolve("invalid");
  refreshing ??= (async (): Promise<RefreshResult> => {
    try {
      const response = await fetchImpl(`${API_BASE_URL}/auth/token/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (response.ok) {
        tokens.set((await response.json()) as TokenPair);
        return "ok";
      }
      if (response.status === 400 || response.status === 401) return "invalid";
      retryAfterMs = Math.min(10, Number(response.headers.get("Retry-After")) || 2) * 1000;
      return "unavailable";
    } catch {
      retryAfterMs = 2000;
      return "unavailable";
    } finally {
      queueMicrotask(() => {
        refreshing = null;
      });
    }
  })();
  return refreshing;
}

function newRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(16).slice(2).padEnd(16, "0");
}

export function authMiddleware(fetchImpl: typeof fetch = fetch): Middleware {
  return {
    onRequest({ request }) {
      const id = newRequestId();
      request.headers.set("X-Request-ID", id);
      const access = tokens.access();
      if (access) request.headers.set("Authorization", `Bearer ${access}`);
      pending.set(id, request.clone());
      return request;
    },
    async onResponse({ request, response }) {
      const id = request.headers.get("X-Request-ID") ?? "";
      const original = pending.get(id);
      pending.delete(id);
      if (response.status !== 401 || !original) return response;
      const path = new URL(request.url).pathname.replace(/^\/api\/v1/, "");
      if (NO_REFRESH.some((p) => path.startsWith(p)) || !tokens.refresh()) return response;

      const body = (await response
        .clone()
        .json()
        .catch(() => ({}))) as { code?: string };
      if (body.code !== "token_invalid" && body.code !== "not_authenticated") return response;

      const result = await refreshSession(fetchImpl);
      if (result === "invalid") {
        tokens.clear();
        sessionEvents.ended();
        return response;
      }
      if (result === "unavailable") return response; // transient: keep the session
      const retry = new Request(original, { headers: new Headers(original.headers) });
      retry.headers.set("Authorization", `Bearer ${tokens.access()}`);
      return fetchImpl(retry); // retried once: a second 401 is returned as-is
    },
  };
}

export function makeClient(fetchImpl: typeof fetch = (...args) => fetch(...args)) {
  const client = createClient<paths>({ baseUrl: ORIGIN, fetch: fetchImpl });
  client.use(authMiddleware(fetchImpl));
  return client;
}

export const api = makeClient();

/**
 * Await an openapi-fetch call and return its data, or throw an ApiError (also for network
 * failures). Keeps every caller's error handling the same.
 */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result;
  try {
    result = await call;
  } catch {
    throw toApiError(0, null);
  }
  const { data, error, response } = result;
  if (!response.ok || error !== undefined) {
    throw toApiError(response.status, error, response.headers.get("X-Request-ID") ?? undefined);
  }
  return data as T;
}
