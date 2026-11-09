import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { SkeletonBlock } from "@/components/ui/States";
import { api, unwrap } from "@/lib/api/client";
import { ApiError, userMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { homeFor, safeNext } from "@/lib/auth/redirects";

import { takeOAuthSession, type Provider } from "./oauth";
import { AuthCard } from "./parts";

const NAMES: Record<Provider, string> = { github: "GitHub", google: "Google" };

/** Messages for the API's error codes, per provider. Codes both providers share live in SHARED. */
const SHARED: Record<string, string> = {
  state_invalid: "This sign-in link expired or didn't start in this browser. Start again.",
  terms_required: "To create an account, accept the terms on the sign-up page first.",
};
const COPY: Record<Provider, Record<string, string>> = {
  github: {
    github_oauth_failed: "GitHub didn't accept the sign-in. Start again.",
    github_email_unverified:
      "Your GitHub account has no verified primary email. Verify one on GitHub, then try again.",
    github_already_linked: "That GitHub account is linked to a different SkillProof account.",
    recruiter_signup_requires_email: "Recruiters register with email first, then link GitHub from settings.",
    github_not_configured: "GitHub sign-in isn't configured on this server yet.",
  },
  google: {
    google_oauth_failed: "Google didn't accept the sign-in. Start again.",
    google_email_unverified:
      "Google says your email address isn't verified. Verify it with Google, then try again.",
    google_already_linked: "That Google account is linked to a different SkillProof account.",
    recruiter_signup_requires_email: "Recruiters register with email first, then link Google from settings.",
    google_not_configured: "Google sign-in isn't configured on this server yet.",
  },
};

function exchange(provider: Provider, body: { code: string; state: string }) {
  return provider === "google"
    ? unwrap(api.POST("/api/v1/auth/google/callback", { body }))
    : unwrap(api.POST("/api/v1/auth/github/callback", { body }));
}

/** The provider sends the browser here with ?code&state. We verify state, then exchange the code. */
export function OAuthCallbackPage({ provider }: { provider: Provider }) {
  const name = NAMES[provider];
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const once = useRef(false); // StrictMode runs effects twice; a code can only be used once

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const code = params.get("code");
    const state = params.get("state");
    const denied = params.get("error");
    const saved = takeOAuthSession(provider);
    if (denied) return setError(`${name} sign-in was cancelled.`);
    if (!code || !state) return setError(`This page needs a code from ${name}. Start the sign-in again.`);
    if (saved.state && saved.state !== state) return setError(SHARED.state_invalid ?? null);
    (async () => {
      try {
        const result = await exchange(provider, { code, state });
        signIn(result);
        navigate(safeNext(saved.next) ?? homeFor(result.user), { replace: true });
      } catch (e) {
        setError((e instanceof ApiError && (COPY[provider][e.code] ?? SHARED[e.code])) || userMessage(e));
      }
    })();
  }, [params, navigate, signIn, provider, name]);

  return (
    <AuthCard title={error ? `${name} sign-in didn't finish` : `Signing you in with ${name}`}>
      {error ? (
        <div className="space-y-5">
          <p role="alert" className="text-mist">
            {error}
          </p>
          <div className="flex gap-3">
            <Link to="/login" className="flex-1">
              <Button variant="glass" className="w-full">
                Back to sign in
              </Button>
            </Link>
            <Link to="/register" className="flex-1">
              <Button className="w-full">Create an account</Button>
            </Link>
          </div>
        </div>
      ) : (
        <SkeletonBlock lines={2} label={`Contacting ${name}`} />
      )}
    </AuthCard>
  );
}
