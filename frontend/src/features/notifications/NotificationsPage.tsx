import { Link, useSearchParams } from "react-router-dom";

import { GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/States";
import { userMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { resolveLink } from "@/lib/auth/redirects";
import { ago } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useMarkAllRead, useMarkRead, useNotifications } from "./api";

export function NotificationsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const unreadOnly = params.get("unread") === "true";
  const page = Number(params.get("page") ?? 1);
  const list = useNotifications(unreadOnly, page);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  return (
    <GlassPanel className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Show"
          value={unreadOnly ? "unread" : "all"}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: "Unread" },
          ]}
          onChange={(v) => setParams(v === "unread" ? { unread: "true" } : {})}
        />
        <Button size="sm" variant="glass" loading={markAll.isPending} onClick={() => markAll.mutate()}>
          Mark all read
        </Button>
      </div>
      {list.isPending ? (
        <SkeletonBlock lines={5} label="Loading notifications" />
      ) : list.isError ? (
        <ErrorState description={userMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.results.length === 0 ? (
        <EmptyState
          title={unreadOnly ? "Nothing unread" : "No notifications yet"}
          description="Analysis results and recruiter feedback appear here."
        />
      ) : (
        <>
          <ul className="divide-y divide-white/[0.06]">
            {list.data.results.map((n) => (
              <li key={n.id} className="flex gap-3 py-3">
                <span
                  aria-hidden
                  className={cn(
                    "mt-2 h-2 w-2 shrink-0 rounded-full",
                    n.readAt ? "bg-white/15" : "bg-flare shadow-[0_0_8px_rgb(var(--flare))]",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {n.linkPath && user ? (
                      <Link
                        to={resolveLink(n.linkPath, user)}
                        onClick={() => !n.readAt && markRead.mutate(n.id)}
                        className="hover:text-flare-hot hover:underline"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                    {!n.readAt && <span className="sr-only"> (unread)</span>}
                  </p>
                  {n.body && <p className="text-sm text-mist">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-mist">{ago(n.createdAt)}</p>
                </div>
                {!n.readAt && (
                  <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                    Mark read
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            count={list.data.count}
            pageSize={20}
            onPage={(p) => setParams({ ...(unreadOnly ? { unread: "true" } : {}), page: String(p) })}
          />
        </>
      )}
    </GlassPanel>
  );
}
