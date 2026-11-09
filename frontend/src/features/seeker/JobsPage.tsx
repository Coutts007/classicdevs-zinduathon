import { useQuery } from "@tanstack/react-query";
import { Briefcase, Lightbulb, MapPin } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { GlassCard, GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { MatchChips, ScoreFigure } from "@/features/recruiter/parts";
import { useJobs } from "@/features/recruiter/api";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import type { Job } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";
import { EMPLOYMENT, MIN_LABELS, REMOTE } from "@/lib/labels";

function MyMatch({ job }: { job: Job }) {
  const match = useQuery({
    queryKey: qk.matchMe(job.id),
    queryFn: () =>
      unwrap(api.GET("/api/v1/jobs/{public_id}/match/me", { params: { path: { public_id: job.id } } })),
  });
  if (match.isPending) return <Skeleton className="h-16 rounded-xl" />;
  if (match.isError) return <p className="text-sm text-bad">{userMessage(match.error)}</p>;
  const m = match.data;
  const need = (name: string) => job.requiredSkills.find((r) => r.skill === name);
  return (
    <div className="space-y-3 rounded-xl border border-line bg-black/20 p-4" aria-live="polite">
      <div className="flex items-center gap-4">
        <ScoreFigure value={m.score} label="Your match" />
        <p className="text-sm text-mist">
          {m.score >= 75
            ? "Strong match. Your code proves most of what this job needs."
            : m.score >= 50
              ? "Good start. A few skills would lift this a lot."
              : "Some gaps. Here's what would help most."}
        </p>
      </div>
      <MatchChips match={m} />
      {(m.missing.length > 0 || m.partial.length > 0) && (
        <ul className="space-y-1.5 text-sm">
          {[...m.missing, ...m.partial].slice(0, 4).map((s) => {
            const r = need(s);
            return (
              <li key={s} className="flex gap-2 text-mist">
                <Lightbulb aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-flare-hot" />
                <span>
                  Show <strong className="text-ink">{s}</strong> at{" "}
                  {MIN_LABELS[r?.minimumLabel ?? "moderate"].toLowerCase()} level or above: a public
                  repository that uses it in real commits over several weeks, ideally with tests.
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-mist">
        Based on your latest analysis.{" "}
        <Link to="/app/analyse" className="text-flare-hot underline underline-offset-2">
          Re-run it
        </Link>{" "}
        after you push new work.
      </p>
    </div>
  );
}

function JobItem({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  return (
    <GlassCard className="space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg">{job.title}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-mist">
            <span>{job.company}</span>
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden className="h-3.5 w-3.5" /> {job.location}
              </span>
            )}
            <span>{EMPLOYMENT[job.employmentType ?? "full_time"]}</span>
            <span>{REMOTE[job.remotePolicy ?? "onsite"]}</span>
            {job.closesAt && <span>Closes {fmtDate(job.closesAt)}</span>}
          </p>
        </div>
        <Button
          size="sm"
          variant={open ? "ghost" : "glass"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide match" : "How well do I match?"}
        </Button>
      </div>
      {job.description && (
        <p className="line-clamp-3 whitespace-pre-line text-sm text-mist">{job.description}</p>
      )}
      <p className="text-sm">
        <span className="text-mist">Needs: </span>
        {job.requiredSkills.map((r) => r.skill).join(", ") || "No specific skills listed"}
      </p>
      {open && <MyMatch job={job} />}
    </GlassCard>
  );
}

export function SeekerJobsPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const jobs = useJobs("open", page);
  if (jobs.isPending)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-card" />
        ))}
      </div>
    );
  if (jobs.isError)
    return (
      <GlassPanel>
        <ErrorState description={userMessage(jobs.error)} onRetry={() => jobs.refetch()} />
      </GlassPanel>
    );
  if (jobs.data.count === 0)
    return (
      <GlassPanel>
        <EmptyState
          icon={<Briefcase className="h-5 w-5" />}
          title="No open jobs right now"
          description="Check back soon. Keep your card fresh so recruiters find you in the meantime."
        />
      </GlassPanel>
    );
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {jobs.data.results.map((j) => (
          <li key={j.id}>
            <JobItem job={j} />
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        count={jobs.data.count}
        pageSize={20}
        onPage={(p) => setParams({ page: String(p) })}
      />
    </div>
  );
}
