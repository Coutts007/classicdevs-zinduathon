import { MailWarning, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";

/** App-wide, dismissible until reload, while the email is unverified (analyses and approval need it). */
export function EmailBanner() {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user || user.emailVerified || hidden) return null;
  return (
    <div
      role="status"
      className="glass-panel mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border-warn/30 px-4 py-3 text-sm"
    >
      <MailWarning aria-hidden className="h-4 w-4 text-warn" />
      <p className="flex-1">
        Verify your email address. We sent a link to <span className="text-ink">{user.email}</span>.
      </p>
      <Button
        size="sm"
        variant="glass"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await unwrap(api.POST("/api/v1/auth/email/resend"));
            toast("Verification email sent");
          } catch (e) {
            toast.error(userMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Resend link
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setHidden(true)}
        className="grid h-8 w-8 place-items-center rounded-full text-mist hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
