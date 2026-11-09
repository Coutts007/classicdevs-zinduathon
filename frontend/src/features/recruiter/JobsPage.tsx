import { Briefcase, MapPin, Plus } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { GlassCard, GlassPanel } from "@/components/glass/Glass";
import { StatusChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { userMessage } from "@/lib/api/errors";
import type { JobStatus } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";
import { EMPLOYMENT, JOB_STATUS, REMOTE } from "@/lib/labels";

import { useJobs } from "./api";

export function JobsPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as JobStatus | "";
  const page = Number(params.get("page") ?? 1);
  const jobs = useJobs(status, page);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="overflow-x-auto">
          <Segmented
            label="Filter by status"
            value={status || "all"}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "draft", label: "Drafts" },
              { value: "closed", label: "Closed" },
            ]}
            onChange={(v) => setParams(v === "all" ? {} : { status: v })}
          />
        </div>
        <Link to="/recruiter/jobs/new">
          <Button>
            <Plus aria-hidden className="h-4 w-4" /> New job
          </Button>
        </Link>
      </div>
      {jobs.isPending ? (
        Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-card" />)
      ) : jobs.isError ? (
        <GlassPanel>
          <ErrorState description={userMessage(jobs.error)} onRetry={() => jobs.refetch()} />
        </GlassPanel>
      ) : jobs.data.count === 0 ? (
        <GlassPanel>
          <EmptyState
            icon={<Briefcase className="h-5 w-5" />}
            title={status ? `No ${JOB_STATUS[status].label.toLowerCase()} jobs` : "No job postings yet"}
            description="Post a job with the skills it needs, and we'll rank candidates by proven skill."
            action={
              <Link to="/recruiter/jobs/new">
                <Button>New job</Button>
              </Link>
            }
          />
        </GlassPanel>
      ) : (
        <>
          <ul className="space-y-3">
            {jobs.data.results.map((j) => (
              <li key={j.id}>
                <GlassCard className="flex flex-wrap items-center gap-4 p-4 hover:border-flare/40">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/recruiter/jobs/${j.id}`}
                      className="font-semibold after:absolute after:inset-0 after:rounded-[inherit] hover:text-flare-hot"
                    >
                      {j.title}
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-mist">
                      {j.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin aria-hidden className="h-3.5 w-3.5" /> {j.location}
                        </span>
                      )}
                      <span>{EMPLOYMENT[j.employmentType ?? "full_time"]}</span>
                      <span>{REMOTE[j.remotePolicy ?? "onsite"]}</span>
                      <span>{j.requiredSkills.length} skills</span>
                      {j.closesAt && <span>Closes {fmtDate(j.closesAt)}</span>}
                    </p>
                  </div>
                  <StatusChip tone={JOB_STATUS[j.status ?? "draft"].tone}>
                    {JOB_STATUS[j.status ?? "draft"].label}
                  </StatusChip>
                </GlassCard>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            count={jobs.data.count}
            pageSize={20}
            onPage={(p) => setParams({ ...(status ? { status } : {}), page: String(p) })}
          />
        </>
      )}
    </div>
  );
}
