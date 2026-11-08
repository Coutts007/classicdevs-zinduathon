import { CheckCheck, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { GlassCard, GlassPanel } from "@/components/glass/Glass";
import { StatusChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import { ago } from "@/lib/format";
import { FEEDBACK_STATUS } from "@/lib/labels";

/** Feedback this recruiter sent. The API has no per-channel delivery status for recruiters (F-019). */
export function FeedbackSentPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const list = useQuery({
    queryKey: qk.feedback(page, 20),
    queryFn: () => unwrap(api.GET("/api/v1/feedback", { params: { query: { page, pageSize: 20 } } })),
  });
  if (list.isPending)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-card" />
        ))}
      </div>
    );
  if (list.isError)
    return (
      <GlassPanel>
        <ErrorState description={userMessage(list.error)} onRetry={() => list.refetch()} />
      </GlassPanel>
    );
  if (list.data.count === 0)
    return (
      <GlassPanel>
        <EmptyState
          title="You haven't sent feedback yet"
          description="Specific feedback is the fastest way to build trust with candidates. Send it from a candidate's card."
          action={
            <Link to="/recruiter/candidates">
              <Button>Find candidates</Button>
            </Link>
          }
        />
      </GlassPanel>
    );
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {list.data.results.map((f) => {
          const login = f.candidate?.githubLogin;
          const st = FEEDBACK_STATUS[f.status];
          return (
            <li key={f.id}>
              <GlassCard className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {login ? (
                    <Link
                      to={`/recruiter/candidates/${login}`}
                      className="font-semibold hover:text-flare-hot"
                    >
                      {f.candidate?.name || `@${login}`}
                    </Link>
                  ) : (
                    <span className="font-semibold">{f.candidate?.name || "Deleted account"}</span>
                  )}
                  <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  {f.jobPosting && <span className="text-sm text-mist">{f.jobPosting.title}</span>}
                  <span className="ml-auto text-xs text-mist">{ago(f.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{f.message}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-mist">
                  {f.moderation === "held" ? (
                    <span className="text-warn">Held for review before it's delivered</span>
                  ) : f.moderation === "rejected" ? (
                    <span className="text-bad">Not delivered (blocked by moderation)</span>
                  ) : f.readAt ? (
                    <>
                      <CheckCheck aria-hidden className="h-3.5 w-3.5 text-ok" /> Read {ago(f.readAt)}
                    </>
                  ) : (
                    <>
                      <Clock aria-hidden className="h-3.5 w-3.5" /> Delivered, not read yet
                    </>
                  )}
                </p>
              </GlassCard>
            </li>
          );
        })}
      </ul>
      <Pagination
        page={page}
        count={list.data.count}
        pageSize={20}
        onPage={(p) => setParams({ page: String(p) })}
      />
    </div>
  );
}
