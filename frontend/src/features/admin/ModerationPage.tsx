import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { GlassCard } from "@/components/glass/Glass";
import { StatusChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { ago } from "@/lib/format";
import { FEEDBACK_STATUS } from "@/lib/labels";

import { ListPanel } from "./parts";
import { useUrlState } from "./url-state";

/** Feedback the moderation filter held back. Release sends it (in-app, email, SMS); reject drops it. */
export function ModerationPage() {
  const { page, setPage } = useUrlState();
  const client = useQueryClient();
  const list = useQuery({
    queryKey: ["admin", "held", page],
    queryFn: () => unwrap(api.GET("/api/v1/admin/feedback/held")),
  });
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "release" | "reject" }) =>
      action === "release"
        ? unwrap(
            api.POST("/api/v1/admin/feedback/{public_id}/release", { params: { path: { public_id: id } } }),
          )
        : unwrap(
            api.POST("/api/v1/admin/feedback/{public_id}/reject", { params: { path: { public_id: id } } }),
          ),
    onSuccess: (_d, v) => {
      toast(
        v.action === "release" ? "Released: the job seeker gets it now" : "Rejected: it won't be delivered",
      );
      void client.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  return (
    <ListPanel
      query={list}
      page={page}
      onPage={setPage}
      empty={{
        title: "Nothing held for review",
        description: "Feedback the filter flags (contact details, abuse) waits here.",
      }}
    >
      {(rows) => (
        <ul className="space-y-3">
          {rows.map((f) => (
            <li key={f.id}>
              <GlassCard className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{f.companyName}</span>
                  <span className="text-mist">
                    {f.recruiter ?? "deleted recruiter"} → {f.jobSeeker}
                  </span>
                  <StatusChip tone={FEEDBACK_STATUS[f.status].tone}>
                    {FEEDBACK_STATUS[f.status].label}
                  </StatusChip>
                  <span className="ml-auto text-xs text-mist">{ago(f.createdAt)}</span>
                </div>
                <p className="whitespace-pre-line text-sm">{f.message}</p>
                {f.heldReason && <p className="text-sm text-warn">Held because: {f.heldReason}</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={
                      decide.isPending &&
                      decide.variables?.id === f.id &&
                      decide.variables.action === "release"
                    }
                    onClick={() => decide.mutate({ id: f.id, action: "release" })}
                  >
                    Release
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={
                      decide.isPending &&
                      decide.variables?.id === f.id &&
                      decide.variables.action === "reject"
                    }
                    onClick={() => decide.mutate({ id: f.id, action: "reject" })}
                  >
                    Reject
                  </Button>
                </div>
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </ListPanel>
  );
}
