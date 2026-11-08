import { ArrowLeft, Mail, MessageSquareText, Send, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";

import { GlassPanel } from "@/components/glass/Glass";
import { StatusChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SkillCard, SkillCardSkeleton } from "@/features/card/SkillCard";
import { ApiError, fieldErrors, userMessage } from "@/lib/api/errors";
import type { CandidateDetail, FeedbackStatus, ShortlistStage } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { env } from "@/lib/env";
import { ago } from "@/lib/format";
import { FEEDBACK_STATUS, STAGE_ORDER, STAGES } from "@/lib/labels";

import { useAddToShortlist, useCandidate, useJobs, useSendFeedback, useUpdateShortlist } from "./api";

const MAX = 1000;

function useOpenJobs() {
  const jobs = useJobs("open");
  return jobs.data?.results ?? [];
}

function ShortlistControl({ login, detail }: { login: string; detail: CandidateDetail }) {
  const jobs = useOpenJobs();
  const add = useAddToShortlist(login);
  const update = useUpdateShortlist();
  const [jobId, setJobId] = useState("");
  const taken = new Set(detail.shortlist.map((s) => s.jobPosting?.id ?? ""));
  return (
    <section aria-labelledby="shortlist-h" className="space-y-3">
      <h2 id="shortlist-h" className="text-base">
        Shortlist
      </h2>
      {detail.shortlist.map((entry) => (
        <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-sm">{entry.jobPosting?.title ?? "General shortlist"}</p>
          <Select
            aria-label={`Stage for ${entry.jobPosting?.title ?? "general shortlist"}`}
            value={entry.stage ?? "saved"}
            onChange={(e) =>
              update.mutate(
                { id: entry.id, stage: e.target.value as ShortlistStage },
                { onSuccess: () => toast(`Moved to ${STAGES[e.target.value as ShortlistStage].label}`) },
              )
            }
            className="h-9 w-36 py-0 text-sm"
          >
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {STAGES[s].label}
              </option>
            ))}
          </Select>
        </div>
      ))}
      <div className="flex gap-2">
        <Select
          aria-label="Job for the shortlist"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="h-10 flex-1 py-0 text-sm"
        >
          <option value="">No specific job</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id} disabled={taken.has(j.id)}>
              {j.title}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="glass"
          loading={add.isPending}
          disabled={taken.has(jobId)}
          onClick={() => add.mutate({ jobPostingId: jobId || null })}
        >
          Shortlist
        </Button>
      </div>
      {taken.has(jobId) && <p className="text-xs text-mist">Already on this shortlist.</p>}
    </section>
  );
}

function FeedbackComposer({ login, name }: { login: string; name: string }) {
  const { user } = useAuth();
  const jobs = useOpenJobs();
  const send = useSendFeedback(login);
  const [status, setStatus] = useState<FeedbackStatus>("shortlisted");
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const company = user?.recruiterProfile?.company?.name ?? "Your company";
  const label = FEEDBACK_STATUS[status].label;
  const length = message.trim().length;
  const submit = () => {
    setError(null);
    send.mutate(
      { status, message: message.trim(), jobPostingId: jobId || null },
      {
        onSuccess: () => {
          setMessage("");
          // The API doesn't report which channels were used (DECISIONS F-019).
          toast("Feedback sent", {
            description: "They'll see it in their inbox, and by email and SMS if they've turned those on.",
          });
        },
        onError: (e) => {
          const f = fieldErrors(e);
          setError(f.message ?? (e instanceof ApiError ? userMessage(e) : "Couldn't send it."));
        },
      },
    );
  };
  return (
    <section aria-labelledby="feedback-h" className="space-y-4">
      <h2 id="feedback-h" className="flex items-center gap-2 text-base">
        <MessageSquareText aria-hidden className="h-4 w-4 text-flare-hot" /> Send feedback to {name}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Status">
          {({ id }) => (
            <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)}>
              {Object.entries(FEEDBACK_STATUS).map(([v, s]) => (
                <option key={v} value={v}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Job (optional)">
          {({ id }) => (
            <Select id={id} value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">None</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field
        label="Message"
        error={error ?? undefined}
        hint={
          <span className={length > MAX ? "text-bad" : undefined}>
            {length}/{MAX} characters. Be specific: what stood out, and what happens next.
          </span>
        }
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid || length > MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
        )}
      </Field>
      <details className="rounded-xl border border-line px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Preview what {name} receives</summary>
        <div className="mt-3 space-y-3 text-mist">
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Mail aria-hidden className="h-3.5 w-3.5" /> Email · {company} sent you feedback
            </p>
            <p className="mt-1 whitespace-pre-line text-ink">
              {user?.fullName || "A recruiter"} at {company} sent you feedback.{"\n"}Status: {label}
              {"\n\n"}
              {message.trim() || "Your message"}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Smartphone aria-hidden className="h-3.5 w-3.5" /> SMS (if they opted in)
            </p>
            <p className="mt-1 text-ink">
              SkillProof: {company} sent you feedback ({label}). Read it: {env.appUrl}/inbox Reply STOP to opt
              out
            </p>
            <p className="mt-1 text-xs">The SMS never includes your message; they read it in SkillProof.</p>
          </div>
        </div>
      </details>
      <Button onClick={submit} loading={send.isPending} disabled={!length || length > MAX} className="w-full">
        <Send aria-hidden className="h-4 w-4" /> Send feedback
      </Button>
    </section>
  );
}

export function CandidatePage() {
  const { login = "" } = useParams();
  const detail = useCandidate(login);
  const { hash } = useLocation();
  const loaded = detail.isSuccess;
  useEffect(() => {
    // "Send feedback" from a job's matches links to #feedback-h: jump to the composer.
    if (loaded && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [loaded, hash]);
  const back = (
    <Link
      to="/recruiter/candidates"
      className="inline-flex items-center gap-1 text-sm text-mist hover:text-ink"
    >
      <ArrowLeft aria-hidden className="h-4 w-4" /> Candidates
    </Link>
  );
  if (detail.isPending)
    return (
      <div className="space-y-3">
        {back}
        <SkillCardSkeleton />
      </div>
    );
  if (detail.isError)
    return (
      <div className="space-y-3">
        {back}
        <GlassPanel>
          {detail.error instanceof ApiError && detail.error.status === 404 ? (
            <EmptyState
              title="This card isn't available"
              description="The person may have hidden their card or deleted their account."
            />
          ) : (
            <ErrorState description={userMessage(detail.error)} onRetry={() => detail.refetch()} />
          )}
        </GlassPanel>
      </div>
    );
  const d = detail.data;
  const name = d.candidate.name || `@${d.candidate.githubLogin}`;
  return (
    <div className="space-y-3">
      {back}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <SkillCard card={d.card} />
        </div>
        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <GlassPanel className="space-y-6 p-5">
            <ShortlistControl login={login} detail={d} />
            <hr className="border-line" />
            <FeedbackComposer login={login} name={name} />
          </GlassPanel>
          <GlassPanel className="p-5">
            <h2 className="text-base">Feedback you sent</h2>
            {d.feedbackSent.length === 0 ? (
              <p className="mt-2 text-sm text-mist">Nothing yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {d.feedbackSent.map((f) => (
                  <li key={f.id} className="rounded-xl border border-line px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <StatusChip tone={FEEDBACK_STATUS[f.status].tone}>
                        {FEEDBACK_STATUS[f.status].label}
                      </StatusChip>
                      <span className="text-xs text-mist">{ago(f.createdAt)}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm">{f.message}</p>
                    {f.moderation && f.moderation !== "sent" && (
                      <p className="mt-1 text-xs text-warn">Held for review</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
