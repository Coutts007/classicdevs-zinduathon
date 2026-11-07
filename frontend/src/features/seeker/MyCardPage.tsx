import { useMutation, useQuery } from "@tanstack/react-query";
import * as Switch from "@radix-ui/react-switch";
import { Copy, ExternalLink } from "lucide-react";
import { useId } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { SkillCard, SkillCardSkeleton } from "@/features/card/SkillCard";
import { api, unwrap } from "@/lib/api/client";
import { ApiError, userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-context";
import { env } from "@/lib/env";

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="block cursor-pointer font-medium">
          {label}
        </label>
        <p id={`${id}-desc`} className="text-sm text-mist">
          {description}
        </p>
      </div>
      <Switch.Root
        id={id}
        aria-describedby={`${id}-desc`}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="relative mt-1 h-6 w-11 shrink-0 rounded-full border border-line bg-white/10 transition data-[state=checked]:border-flare data-[state=checked]:bg-flare"
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}

export function MyCardPage() {
  const { user, refreshMe } = useAuth();
  const login = user?.github?.login ?? "";
  const card = useQuery({
    queryKey: qk.card(login),
    queryFn: () =>
      unwrap(api.GET("/api/v1/cards/{github_login}", { params: { path: { github_login: login } } })),
    enabled: Boolean(login),
  });
  const profile = user?.jobSeekerProfile;
  const update = useMutation({
    mutationFn: (body: { cardVisible?: boolean; openToWork?: boolean }) =>
      unwrap(api.PATCH("/api/v1/me", { body })),
    onSuccess: async () => {
      await refreshMe();
      toast("Saved");
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  const link = `${env.appUrl}/u/${login}`;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="order-2 xl:order-1">
        {!login ? (
          <GlassPanel>
            <EmptyState
              title="No card yet"
              description="Connect GitHub and run your first analysis."
              action={
                <Link to="/app/analyse">
                  <Button>Analyse my GitHub</Button>
                </Link>
              }
            />
          </GlassPanel>
        ) : card.isPending ? (
          <SkillCardSkeleton />
        ) : card.isError ? (
          <GlassPanel>
            <EmptyState
              title={
                card.error instanceof ApiError && card.error.status === 404
                  ? "No card yet"
                  : "Your card didn't load"
              }
              description={
                card.error instanceof ApiError && card.error.status === 404
                  ? "Run your first analysis to create it."
                  : userMessage(card.error)
              }
              action={
                <Link to="/app/analyse">
                  <Button>Analyse my GitHub</Button>
                </Link>
              }
            />
          </GlassPanel>
        ) : (
          <SkillCard card={card.data} />
        )}
      </div>
      <GlassPanel glow className="order-1 h-fit space-y-6 p-6 xl:order-2 xl:sticky xl:top-24">
        <div>
          <h2 className="text-lg">Share your card</h2>
          <p className="mt-1 break-all font-mono text-sm text-mist">
            {login ? link : "Available after your first analysis"}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              disabled={!login}
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                toast("Link copied");
              }}
            >
              <Copy aria-hidden className="h-4 w-4" /> Copy link
            </Button>
            {login && (
              <a href={`/u/${login}`} target="_blank" rel="noreferrer">
                <Button size="sm" variant="glass">
                  <ExternalLink aria-hidden className="h-4 w-4" /> Open
                </Button>
              </a>
            )}
          </div>
        </div>
        <Toggle
          label="Recruiters can find my card"
          description="Off hides you from recruiter search. Your share link keeps working."
          checked={profile?.cardVisible ?? true}
          disabled={update.isPending}
          onChange={(v) => update.mutate({ cardVisible: v })}
        />
        <Toggle
          label="Open to work"
          description="Shown to recruiters and used in their filters."
          checked={profile?.openToWork ?? true}
          disabled={update.isPending}
          onChange={(v) => update.mutate({ openToWork: v })}
        />
      </GlassPanel>
    </div>
  );
}
