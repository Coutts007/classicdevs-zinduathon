/**
 * OAuth from the SPA (backend docs/AUTH.md), the same for GitHub and Google: ask the API for the
 * authorize URL, keep the signed `state` (and where to go next) in sessionStorage, send the browser
 * to the provider. /auth/<provider>/callback compares the returned state before posting the code to
 * the API. Each provider keeps its own storage keys, so two flows can't read each other's state.
 */
import { api, unwrap } from "@/lib/api/client";

export type Provider = "github" | "google";

type Start = {
  role?: "job_seeker" | "recruiter";
  link?: boolean;
  acceptTerms?: boolean;
  emailFeedback?: boolean;
  smsFeedback?: boolean;
  next?: string | null;
};

const stateKey = (provider: Provider) => `skillproof.${provider}State`;
const nextKey = (provider: Provider) => `skillproof.${provider}Next`;

export async function startOAuth(provider: Provider, options: Start = {}): Promise<void> {
  const { next, ...query } = options;
  const { authorizeUrl, state } =
    provider === "google"
      ? await unwrap(api.GET("/api/v1/auth/google/authorize", { params: { query } }))
      : await unwrap(api.GET("/api/v1/auth/github/authorize", { params: { query } }));
  try {
    sessionStorage.setItem(stateKey(provider), state);
    if (next) sessionStorage.setItem(nextKey(provider), next);
  } catch {
    /* without storage we can't compare state; the API still verifies its signature */
  }
  window.location.assign(authorizeUrl);
}

export function takeOAuthSession(provider: Provider): { state: string | null; next: string | null } {
  try {
    const state = sessionStorage.getItem(stateKey(provider));
    const next = sessionStorage.getItem(nextKey(provider));
    sessionStorage.removeItem(stateKey(provider));
    sessionStorage.removeItem(nextKey(provider));
    return { state, next };
  } catch {
    return { state: null, next: null };
  }
}
