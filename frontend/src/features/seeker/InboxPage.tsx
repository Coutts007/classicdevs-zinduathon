import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { GlassPanel } from "@/components/glass/Glass";
import { StatusChip } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/States";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import type { Feedback } from "@/lib/api/types";
import { ago, fmtDate } from "@/lib/format";
import { FEEDBACK_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Status = "all" | "shortlisted" | "interview" | "not_a_fit" | "general";
const STATUS = FEEDBACK_STATUS;
type Page = { count: number; next: string | null; previous: string | null; results: Feedback[] };

/** Recruiter feedback for job seekers: list + detail, marked read when opened. */
export function InboxPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const status = (params.get("status") ?? "all") as Status;
  const openId = params.get("open");
  const client = useQueryClient();
  const list = useQuery({
    queryKey: qk.feedback(page, 20),
    queryFn: () => unwrap(api.GET("/api/v1/feedback", { params: { query: { page, pageSize: 20 } } })),
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      unwrap(api.POST("/api/v1/feedback/{public_id}/read", { params: { path: { public_id: id } } })),
    onMutate: (id) => {
      const now = new Date().toISOString();
      client.setQueriesData<Page>({ queryKey: ["feedback"] }, (old) =>
        old?.results
          ? { ...old, results: old.results.map((f) => (f.id === id ? { ...f, readAt: f.readAt ?? now } : f)) }
          : old,
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["feedback"] }),
  });

  // The API has no status filter yet (docs/DECISIONS.md F-015), so the current page is filtered here.
  const items = (list.data?.results ?? []).filter((f) => status === "all" || f.status === status);
  const open = items.find((f) => f.id === openId) ?? null;
  useEffect(() => {
    if (open && !open.readAt) markRead.mutate(open.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mark once per opened message
  }, [open?.id]);

  const set = (next: Record<string, string | null>) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v === null ? merged.delete(k) : merged.set(k, v)));
    setParams(merged);
  };

  if (list.isPending)
    return (
      <GlassPanel className="p-6">
        <SkeletonBlock lines={6} label="Loading feedback" />
      </GlassPanel>
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
          title="No feedback yet"
          description="When recruiters send you feedback, it lands here and by email or SMS if you've turned those on."
        />
      </GlassPanel>
    );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Segmented
          label="Filter by status"
          value={status}
          options={[
            { value: "all", label: "All" },
            ...Object.entries(STATUS).map(([value, s]) => ({ value: value as Status, label: s.label })),
          ]}
          onChange={(v) => set({ status: v === "all" ? null : v, open: null })}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* Small screens show the list or the open message, not both. */}
        <GlassPanel className={cn("min-w-0 p-2", open && "hidden lg:block")}>
          {items.length === 0 ? (
            <EmptyState title="Nothing with this status" description="Try another filter." />
          ) : (
            <ul>
              {items.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    aria-current={f.id === openId ? "true" : undefined}
                    onClick={() => set({ open: f.id })}
                    className={cn(
                      "flex w-full gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[0.04]",
                      f.id === openId && "bg-white/[0.07]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-2 h-2 w-2 shrink-0 rounded-full",
                        f.readAt ? "bg-white/15" : "bg-flare shadow-[0_0_8px_rgb(var(--flare))]",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">
                          {f.company}
                          {!f.readAt && <span className="sr-only"> (unread)</span>}
                        </span>
                        <span className="shrink-0 text-xs text-mist">{ago(f.createdAt)}</span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-mist">{f.message}</span>
                      <StatusChip
                        tone={STATUS[f.status as keyof typeof STATUS]?.tone ?? "neutral"}
                        className="mt-2"
                      >
                        {STATUS[f.status as keyof typeof STATUS]?.label ?? f.status}
                      </StatusChip>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            count={list.data.count}
            pageSize={20}
            onPage={(p) => set({ page: String(p), open: null })}
          />
        </GlassPanel>
        <GlassPanel
          glow={Boolean(open)}
          className={cn("min-w-0 p-6", !open && "hidden lg:block")}
          aria-live="polite"
        >
          {open ? (
            <article>
              <button
                type="button"
                onClick={() => set({ open: null })}
                className="mb-4 inline-flex items-center gap-1 text-sm text-mist hover:text-ink lg:hidden"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" /> All feedback
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-flare-hot">
                  <Building2 aria-hidden className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl">{open.company}</h2>
                  <p className="text-sm text-mist">
                    {open.recruiterName} · {fmtDate(open.createdAt)}
                    {open.jobPosting && <> · {open.jobPosting.title}</>}
                  </p>
                </div>
                <StatusChip
                  tone={STATUS[open.status as keyof typeof STATUS]?.tone ?? "neutral"}
                  className="ml-auto"
                >
                  {STATUS[open.status as keyof typeof STATUS]?.label ?? open.status}
                </StatusChip>
              </div>
              <p className="mt-6 whitespace-pre-line leading-relaxed">{open.message}</p>
            </article>
          ) : (
            <EmptyState title="Pick a message" description="Select feedback on the left to read it." />
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
