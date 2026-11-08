import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { ChipInput } from "@/components/ui/ChipInput";
import { ErrorState, SkeletonBlock } from "@/components/ui/States";
import { GithubButton } from "@/features/auth/parts";
import { SkillCard } from "@/features/card/SkillCard";
import { api, unwrap } from "@/lib/api/client";
import { ApiError, userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

import { useAnalysisPolling, useStartAnalysis } from "./useAnalysis";

const STEPS = [
  "Reading your repositories",
  "Reading your commits",
  "Finding your skills",
  "Scoring the evidence",
];

export function ProgressSteps({ step }: { step: number }) {
  return (
    <ol className="space-y-3" aria-label="Analysis progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = step > n ? "done" : step === n ? "active" : "todo";
        return (
          <li
            key={label}
            className="flex items-center gap-3"
            aria-current={state === "active" ? "step" : undefined}
          >
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full border text-xs",
                state === "done" && "border-ok/60 bg-ok/10 text-ok",
                state === "active" &&
                  "border-flare bg-flare/15 text-flare-hot shadow-[0_0_14px_rgb(var(--flare)/0.6)]",
                state === "todo" && "border-line text-mist",
              )}
            >
              {state === "done" ? (
                <Check aria-hidden className="h-4 w-4" />
              ) : state === "active" ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                n
              )}
            </span>
            <span className={cn(state === "todo" ? "text-mist" : "text-ink")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const FAILURE: Record<string, string> = {
  no_public_repos: "This GitHub account has no public repositories yet. Push a project and analyse again.",
  not_found: "GitHub couldn't find that account.",
  github_rate_limited: "GitHub's rate limit was reached. Try again in an hour.",
  github_unavailable: "GitHub didn't answer. Try again in a few minutes.",
  timeout: "The analysis took too long and was stopped. Try again.",
};

export function AnalysePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const claimed = useQuery({
    queryKey: qk.claimedSkills,
    queryFn: () => unwrap(api.GET("/api/v1/me/claimed-skills")),
  });
  const [skills, setSkills] = useState<string[] | null>(null);
  useEffect(() => {
    if (claimed.data && skills === null) setSkills(claimed.data.skills.map((s) => s.rawText));
  }, [claimed.data, skills]);

  const saveClaims = useMutation({
    mutationFn: (list: string[]) => unwrap(api.PUT("/api/v1/me/claimed-skills", { body: { skills: list } })),
    onSuccess: (data) => queryClient.setQueryData(qk.claimedSkills, data),
  });
  const start = useStartAnalysis();
  const poll = useAnalysisPolling(start.activeId);
  const analysis = poll.data;

  if (!user?.github) {
    return (
      <GlassPanel glow className="mx-auto max-w-xl p-8 text-center">
        <h2 className="text-2xl">Connect your GitHub account</h2>
        <p className="mt-2 text-mist">
          We only analyse accounts you own, so sign in with GitHub once. We read public repositories only.
        </p>
        <div className="mx-auto mt-6 max-w-xs">
          <GithubButton
            label="Connect GitHub"
            options={{ link: true, next: "/app/analyse" }}
            onError={(m) => toast.error(m)}
          />
        </div>
      </GlassPanel>
    );
  }

  const run = async (force: boolean) => {
    try {
      if (
        skills &&
        claimed.data &&
        skills.join("|") !== claimed.data.skills.map((s) => s.rawText).join("|")
      ) {
        await saveClaims.mutateAsync(skills);
      }
      await start.mutateAsync(force);
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.code === "email_not_verified"
          ? "Verify your email first. Check your inbox for the link."
          : userMessage(e),
      );
    }
  };

  const busy = analysis?.status === "queued" || analysis?.status === "running";
  return (
    <div className="space-y-4">
      <GlassPanel glow={!analysis} className="p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-2xl">Analyse @{user.github.login}</h2>
            <p className="mt-1 text-mist">
              List what your CV claims; we'll check each one against your public code.
            </p>
            <div className="mt-6">
              {claimed.isPending ? (
                <SkeletonBlock lines={2} />
              ) : (
                <ChipInput value={skills ?? []} onChange={setSkills} />
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                loading={start.isPending || saveClaims.isPending}
                disabled={busy}
                onClick={() => run(false)}
              >
                Analyse my GitHub
              </Button>
              {analysis?.status === "completed" && (
                <Button size="lg" variant="glass" disabled={busy} onClick={() => run(true)}>
                  Run a fresh analysis
                </Button>
              )}
            </div>
          </div>
          <div aria-live="polite">
            {busy ? (
              <>
                <p className="mb-4 font-semibold">Reading the evidence…</p>
                <ProgressSteps step={analysis.progressStep} />
              </>
            ) : analysis?.status === "failed" ? (
              <ErrorState
                title="The analysis didn't finish"
                description={FAILURE[analysis.errorCode] ?? analysis.errorMessage}
                onRetry={() => run(true)}
                className="py-4"
              />
            ) : (
              <ul className="space-y-2 text-sm text-mist">
                <li>• Takes about a minute for 15 repositories.</li>
                <li>• Public, non-fork repositories you own.</li>
                <li>• Results under 24 hours old are reused unless you change your claims.</li>
              </ul>
            )}
          </div>
        </div>
      </GlassPanel>
      {analysis?.status === "completed" && analysis.card && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <SkillCard card={analysis.card} tips={analysis.tips} />
        </motion.div>
      )}
    </div>
  );
}
