import { useState, type ReactNode } from "react";

import { GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { userMessage } from "@/lib/api/errors";

import { startOAuth, type Provider } from "./oauth";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Breaks out of the 440px auth column (role choice cards). */
  wide?: boolean;
}) {
  return (
    <GlassPanel
      glow
      scrim
      as="section"
      aria-labelledby="auth-title"
      className={wide ? "relative left-1/2 w-[min(92vw,640px)] -translate-x-1/2 p-7 sm:p-8" : "p-7 sm:p-8"}
    >
      <h1 id="auth-title" className="text-2xl">
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-sm text-mist">{subtitle}</p>}
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-6 border-t border-line pt-5 text-center text-sm text-mist">{footer}</div>}
    </GlassPanel>
  );
}

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-mist">
      <span className="h-px flex-1 bg-white/10" />
      {label}
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

type OAuthOptions = Parameters<typeof startOAuth>[1];

function OAuthButton({
  provider,
  label,
  mark,
  options,
  onError,
}: {
  provider: Provider;
  label: string;
  mark: ReactNode;
  options?: OAuthOptions;
  onError?: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="glass"
      className="w-full"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await startOAuth(provider, options);
        } catch (e) {
          setBusy(false);
          onError?.(userMessage(e));
        }
      }}
    >
      {mark}
      {label}
    </Button>
  );
}

export function GithubButton({
  label = "Continue with GitHub",
  options,
  onError,
}: {
  label?: string;
  options?: OAuthOptions;
  onError?: (m: string) => void;
}) {
  return (
    <OAuthButton
      provider="github"
      label={label}
      mark={<GithubMark className="h-4 w-4" />}
      options={options}
      onError={onError}
    />
  );
}

export function GoogleButton({
  label = "Continue with Google",
  options,
  onError,
}: {
  label?: string;
  options?: OAuthOptions;
  onError?: (m: string) => void;
}) {
  return (
    <OAuthButton
      provider="google"
      label={label}
      mark={<GoogleMark className="h-4 w-4" />}
      options={options}
      onError={onError}
    />
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
      {message}
    </p>
  );
}

/** GitHub's mark (lucide-react 1.x no longer ships brand icons). */
export function GithubMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** Google's four-colour "G" (the redirect flow needs no Google script, which the CSP would block). */
export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
