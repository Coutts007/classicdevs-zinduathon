import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { GlassCard, GlassPanel } from "@/components/glass/Glass";
import { StatusChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, SkeletonBlock, StatTile } from "@/components/ui/States";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-context";
import { ago } from "@/lib/format";
import { FEEDBACK_STATUS, STAGE_ORDER, STAGES } from "@/lib/labels";

import { useJobs, useShortlists } from "./api";

const STRONG = 75; // "top match" threshold shown on the dashboard

export function RecruiterDashboardPage() {
  const { user } = useAuth();
  const jobs = useJobs("open");
  const shortlists = useShortlists();
  const feedback = useQuery({
    queryKey: qk.feedback(1, 50),
    queryFn: () => unwrap(api.GET("/api/v1/feedback", { params: { query: { page: 1, pageSize: 50 } } })),
  });
  const openJobs = (jobs.data?.results ?? []).slice(0, 5);
  const topMatches = useQueries({
    queries: openJobs.map((j) => ({
      queryKey: qk.matches(j.id, 1, STRONG),
      queryFn: () =>
        unwrap(
          api.GET("/api/v1/jobs/{public_id}/matches", {
            params: { path: { public_id: j.id }, query: { page: 1, pageSize: 1, minMatch: STRONG } },
          }),
        ),
    })),
  });
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const sentThisWeek = (feedback.data?.results ?? []).filter(
    (f) => new Date(f.createdAt).getTime() > weekAgo,
  ).length;
  const byStage = Object.fromEntries(
    STAGE_ORDER.map((s) => [s, (shortlists.data ?? []).filter((e) => (e.stage ?? "saved") === s).length]),
  ) as Record<(typeof STAGE_ORDER)[number], number>;
  const maxStage = Math.max(1, ...Object.values(byStage));
  const recent = [...(shortlists.data ?? [])]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const firstName = user?.fullName?.split(" ")[0];

  return (
    <div className="space-y-4">
      <GlassPanel glow className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-2xl">{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</h2>
          <p className="text-mist">Find developers by what their code proves, not what their CV claims.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/recruiter/candidates">
            <Button>
              <Search aria-hidden className="h-4 w-4" /> Search candidates
            </Button>
          </Link>
          <Link to="/recruiter/jobs/new">
            <Button variant="glass">Post a job</Button>
          </Link>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open jobs" value={jobs.data?.count ?? "–"} />
        <StatTile label="On your shortlist" value={shortlists.data?.length ?? "–"} />
        <StatTile label="In interview" value={shortlists.data ? byStage.interview : "–"} />
        <StatTile label="Feedback sent this week" value={feedback.data ? sentThisWeek : "–"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg">Open jobs</h2>
            <Link to="/recruiter/jobs" className="text-sm text-flare-hot hover:underline">
              All jobs
            </Link>
          </div>
          {jobs.isPending ? (
            <SkeletonBlock lines={4} label="Loading jobs" />
          ) : jobs.isError ? (
            <ErrorState description={userMessage(jobs.error)} onRetry={() => jobs.refetch()} />
          ) : openJobs.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-5 w-5" />}
              title="No open jobs"
              description="Publish a job to get a ranked list of matching candidates."
            />
          ) : (
            <ul className="space-y-2">
              {openJobs.map((j, i) => {
                const strong = topMatches[i]?.data?.count;
                return (
                  <li key={j.id}>
                    <GlassCard className="flex items-center gap-3 p-3 hover:border-flare/40">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/recruiter/jobs/${j.id}`}
                          className="font-medium after:absolute after:inset-0 after:rounded-[inherit] hover:text-flare-hot"
                        >
                          {j.title}
                        </Link>
                        <p className="text-xs text-mist">
                          {j.requiredSkills.map((r) => r.skill).join(", ") || "No skills yet"}
                        </p>
                      </div>
                      <p className="text-right text-sm">
                        <span className="tabular text-lg font-bold">{strong ?? "–"}</span>
                        <span className="block text-xs text-mist">{STRONG}%+ matches</span>
                      </p>
                      <ArrowRight aria-hidden className="h-4 w-4 text-mist" />
                    </GlassCard>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg">Shortlist</h2>
            <Link to="/recruiter/shortlists" className="text-sm text-flare-hot hover:underline">
              Open board
            </Link>
          </div>
          {shortlists.isPending ? (
            <SkeletonBlock lines={5} label="Loading shortlist" />
          ) : (
            <dl className="space-y-2.5">
              {STAGE_ORDER.map((s) => (
                <div key={s} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3 text-sm">
                  <dt className="text-mist">{STAGES[s].label}</dt>
                  <div aria-hidden className="h-2 rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-flare/80"
                      style={{ width: `${(byStage[s] / maxStage) * 100}%` }}
                    />
                  </div>
                  <dd className="tabular text-right">{byStage[s]}</dd>
                </div>
              ))}
            </dl>
          )}
        </GlassPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GlassPanel className="p-5">
          <h2 className="mb-3 text-lg">Recent shortlist activity</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-mist">Nobody shortlisted yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link
                    to={`/recruiter/candidates/${e.candidate.githubLogin}`}
                    className="min-w-0 flex-1 truncate hover:text-flare-hot"
                  >
                    {e.candidate.name || `@${e.candidate.githubLogin}`}
                    <span className="text-mist"> · {e.jobPosting?.title ?? "General"}</span>
                  </Link>
                  <StatusChip tone={STAGES[e.stage ?? "saved"].tone}>
                    {STAGES[e.stage ?? "saved"].label}
                  </StatusChip>
                  <span className="w-20 text-right text-xs text-mist">{ago(e.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg">Feedback sent</h2>
            <Link to="/recruiter/feedback" className="text-sm text-flare-hot hover:underline">
              All feedback
            </Link>
          </div>
          {(feedback.data?.results ?? []).length === 0 ? (
            <p className="text-sm text-mist">No feedback sent yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {feedback.data!.results.slice(0, 5).map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {f.candidate?.name || `@${f.candidate?.githubLogin ?? "deleted"}`}
                    <span className="text-mist"> · {f.message}</span>
                  </span>
                  <StatusChip tone={FEEDBACK_STATUS[f.status].tone}>
                    {FEEDBACK_STATUS[f.status].label}
                  </StatusChip>
                  <span className="w-20 text-right text-xs text-mist">{ago(f.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
