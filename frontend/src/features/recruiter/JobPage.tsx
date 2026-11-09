import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, MessageSquareText, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { GlassPanel } from "@/components/glass/Glass";
import { StatusChip, TierBadge, type Tier } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Pagination } from "@/components/ui/Pagination";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, Skeleton, SkeletonBlock } from "@/components/ui/States";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import type { Job, JobStatus } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";
import { EMPLOYMENT, JOB_STATUS, MIN_LABELS, REMOTE } from "@/lib/labels";

import { useAddToShortlist, useJob, useMatches } from "./api";
import { CandidateRow } from "./parts";

function ShortlistButton({ login, jobId }: { login: string; jobId: string }) {
  const add = useAddToShortlist(login);
  return (
    <Button
      size="sm"
      variant="glass"
      aria-label={`Shortlist ${login} for this job`}
      loading={add.isPending}
      disabled={add.isSuccess}
      onClick={() => add.mutate({ jobPostingId: jobId })}
    >
      <Bookmark aria-hidden className="h-4 w-4" />
      <span className="hidden sm:inline">{add.isSuccess ? "Shortlisted" : "Shortlist"}</span>
    </Button>
  );
}

function JobActions({ job }: { job: Job }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const setStatus = useMutation({
    mutationFn: (status: JobStatus) =>
      unwrap(
        api.PATCH("/api/v1/jobs/{public_id}", { params: { path: { public_id: job.id } }, body: { status } }),
      ),
    onSuccess: (saved) => {
      client.setQueryData(["jobs", "detail", job.id], saved);
      void client.invalidateQueries({ queryKey: ["jobs", "list"] });
      toast(saved.status === "open" ? "Job published" : saved.status === "closed" ? "Job closed" : "Saved");
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () =>
      unwrap(api.DELETE("/api/v1/jobs/{public_id}", { params: { path: { public_id: job.id } } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["jobs"] });
      toast("Job deleted");
      navigate("/recruiter/jobs", { replace: true });
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  return (
    <div className="flex flex-wrap gap-2">
      <Link to={`/recruiter/jobs/${job.id}/edit`}>
        <Button size="sm" variant="glass">
          <Pencil aria-hidden className="h-4 w-4" /> Edit
        </Button>
      </Link>
      {job.status !== "open" && (
        <Button size="sm" loading={setStatus.isPending} onClick={() => setStatus.mutate("open")}>
          {job.status === "closed" ? "Reopen" : "Publish"}
        </Button>
      )}
      {job.status === "open" && (
        <Button
          size="sm"
          variant="glass"
          loading={setStatus.isPending}
          onClick={() => setStatus.mutate("closed")}
        >
          Close job
        </Button>
      )}
      <Button size="sm" variant="ghost" aria-label="Delete job" onClick={() => setConfirm(true)}>
        <Trash2 aria-hidden className="h-4 w-4" />
      </Button>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this job?"
        description="Its shortlist links are removed. Feedback you already sent stays with the candidates."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            Delete job
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Matches({ job }: { job: Job }) {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const minMatch = Number(params.get("minMatch") ?? 0);
  const matches = useMatches(job.id, page, minMatch);
  return (
    <section aria-labelledby="matches-h" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="matches-h" className="flex items-center gap-2 text-lg">
          <Users aria-hidden className="h-5 w-5 text-flare-hot" /> Ranked matches
          {matches.data && <span className="text-sm font-normal text-mist">({matches.data.count})</span>}
        </h2>
        <Segmented
          label="Minimum match"
          value={String(minMatch)}
          options={[
            { value: "0", label: "All" },
            { value: "50", label: "50%+" },
            { value: "75", label: "75%+" },
          ]}
          onChange={(v) => setParams(v === "0" ? {} : { minMatch: v })}
        />
      </div>
      {matches.isPending ? (
        Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-card" />)
      ) : matches.isError ? (
        <GlassPanel>
          <ErrorState description={userMessage(matches.error)} onRetry={() => matches.refetch()} />
        </GlassPanel>
      ) : matches.data.count === 0 ? (
        <GlassPanel>
          <EmptyState
            title={job.requiredSkills.length ? "No matches yet" : "Add required skills to see matches"}
            description={
              job.requiredSkills.length
                ? "Try a lower minimum match, or check back as more people analyse their GitHub."
                : "Matches are ranked against the job's required skills."
            }
          />
        </GlassPanel>
      ) : (
        <>
          <ul className="space-y-3">
            {matches.data.results.map(({ match, ...c }) => (
              <li key={c.githubLogin}>
                <CandidateRow
                  candidate={c}
                  match={match}
                  actions={
                    <>
                      <ShortlistButton login={c.githubLogin} jobId={job.id} />
                      <Link to={`/recruiter/candidates/${c.githubLogin}#feedback-h`}>
                        <Button size="sm" variant="ghost" aria-label={`Send feedback to ${c.githubLogin}`}>
                          <MessageSquareText aria-hidden className="h-4 w-4" />
                        </Button>
                      </Link>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            count={matches.data.count}
            pageSize={20}
            onPage={(p) =>
              setParams({ ...(minMatch ? { minMatch: String(minMatch) } : {}), page: String(p) })
            }
          />
        </>
      )}
    </section>
  );
}

export function JobPage() {
  const { id = "" } = useParams();
  const job = useJob(id);
  const back = (
    <Link to="/recruiter/jobs" className="inline-flex items-center gap-1 text-sm text-mist hover:text-ink">
      <ArrowLeft aria-hidden className="h-4 w-4" /> Jobs
    </Link>
  );
  if (job.isPending)
    return (
      <div className="space-y-3">
        {back}
        <GlassPanel className="p-6">
          <SkeletonBlock lines={5} label="Loading job" />
        </GlassPanel>
      </div>
    );
  if (job.isError)
    return (
      <div className="space-y-3">
        {back}
        <GlassPanel>
          <ErrorState description={userMessage(job.error)} onRetry={() => job.refetch()} />
        </GlassPanel>
      </div>
    );
  const j = job.data;
  const st = JOB_STATUS[j.status ?? "draft"];
  return (
    <div className="space-y-4">
      {back}
      <GlassPanel glow className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl">{j.title}</h2>
              <StatusChip tone={st.tone}>{st.label}</StatusChip>
            </div>
            <p className="mt-1 text-sm text-mist">
              {j.company} ·{" "}
              {[j.location, EMPLOYMENT[j.employmentType ?? "full_time"], REMOTE[j.remotePolicy ?? "onsite"]]
                .filter(Boolean)
                .join(" · ")}
              {j.closesAt && <> · Closes {fmtDate(j.closesAt)}</>}
            </p>
          </div>
          <JobActions job={j} />
        </div>
        {j.description && (
          <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-mist">{j.description}</p>
        )}
        <ul aria-label="Required skills" className="flex flex-wrap gap-2">
          {j.requiredSkills.map((r) => (
            <li
              key={r.skill}
              className="glass-pill inline-flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-sm"
            >
              {r.skill}
              <TierBadge
                tier={MIN_LABELS[r.minimumLabel ?? "moderate"] as Tier}
                className="h-5 px-2 text-[11px]"
              />
              <span className="pr-2 text-xs text-mist" title="Weight">
                ×{r.weight ?? 1}
              </span>
            </li>
          ))}
        </ul>
      </GlassPanel>
      <Matches job={j} />
    </div>
  );
}
