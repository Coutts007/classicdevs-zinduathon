import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { StatusChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import type { RecruiterQueue } from "@/lib/api/types";
import { ago, fmtDate } from "@/lib/format";

import { ADMIN_LIVE } from "./live";
import { ListPanel } from "./parts";
import { useUrlState } from "./url-state";

type Status = "pending" | "approved" | "rejected" | "suspended";
const TONE = { pending: "warn", approved: "ok", rejected: "bad", suspended: "bad" } as const;

function ReviewDialog({
  item,
  action,
  onClose,
}: {
  item: RecruiterQueue | null;
  action: "approve" | "reject";
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const review = useMutation({
    mutationFn: () =>
      action === "approve"
        ? unwrap(
            api.POST("/api/v1/admin/recruiters/{public_id}/approve", {
              params: { path: { public_id: item!.id } },
              body: { note },
            }),
          )
        : unwrap(
            api.POST("/api/v1/admin/recruiters/{public_id}/reject", {
              params: { path: { public_id: item!.id } },
              body: { note },
            }),
          ),
    onSuccess: () => {
      toast(
        action === "approve"
          ? `${item?.fullName || item?.email} approved`
          : `${item?.fullName || item?.email} rejected`,
      );
      void client.invalidateQueries({ queryKey: ["admin"] });
      setNote("");
      onClose();
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(o) => !o && onClose()}
      title={action === "approve" ? "Approve recruiter" : "Reject recruiter"}
      description={
        item && (
          <>
            {item.fullName || item.email} at <strong className="text-ink">{item.company}</strong>.{" "}
            {action === "approve"
              ? "They can search candidates and send feedback straight away. We email them."
              : "They keep their account but can't use recruiter tools. We email them your note."}
          </>
        )
      }
    >
      <div className="space-y-4">
        <Field label={action === "approve" ? "Note (optional)" : "Reason (shown to them)"}>
          {({ id }) => (
            <Textarea
              id={id}
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={action === "approve" ? "primary" : "danger"}
            loading={review.isPending}
            disabled={action === "reject" && !note.trim()}
            onClick={() => review.mutate()}
          >
            {action === "approve" ? "Approve" : "Reject"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function RecruitersPage() {
  const { get, page, set, setPage } = useUrlState();
  const status = (get("status") || "pending") as Status;
  const list = useQuery({
    queryKey: ["admin", "recruiters", status, page],
    queryFn: () => unwrap(api.GET("/api/v1/admin/recruiters", { params: { query: { status, page } } })),
    placeholderData: keepPreviousData,
    ...ADMIN_LIVE,
  });
  const [review, setReview] = useState<{ item: RecruiterQueue; action: "approve" | "reject" } | null>(null);
  return (
    <>
      <ListPanel
        query={list}
        page={page}
        onPage={setPage}
        empty={{
          title: status === "pending" ? "No one is waiting" : `No ${status} recruiters`,
          description:
            status === "pending" ? "New recruiter sign-ups appear here for review." : "Try another tab.",
        }}
        toolbar={
          <div className="overflow-x-auto">
            <Segmented
              label="Approval status"
              value={status}
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "suspended", label: "Suspended" },
              ]}
              onChange={(v) => set({ status: v === "pending" ? null : v })}
            />
          </div>
        }
      >
        {(rows) => (
          <DataTable
            caption="Recruiters"
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              {
                key: "company",
                header: "Company",
                cell: (r) => <span className="font-medium">{r.company}</span>,
                sortValue: (r) => r.company.toLowerCase(),
              },
              {
                key: "name",
                header: "Recruiter",
                cell: (r) => (
                  <div>
                    <p>{r.fullName || "–"}</p>
                    <p className="text-xs text-mist">
                      {r.email}
                      {r.jobTitle && <> · {r.jobTitle}</>}
                    </p>
                  </div>
                ),
                sortValue: (r) => r.fullName.toLowerCase(),
              },
              {
                key: "email",
                header: "Email",
                cell: (r) => (
                  <StatusChip tone={r.emailVerified ? "ok" : "warn"}>
                    {r.emailVerified ? "Verified" : "Not verified"}
                  </StatusChip>
                ),
              },
              {
                key: "requested",
                header: "Requested",
                cell: (r) => <span title={fmtDate(r.createdAt)}>{ago(r.createdAt)}</span>,
                sortValue: (r) => r.createdAt,
              },
              {
                key: "status",
                header: "Status",
                cell: (r) => (
                  <div>
                    <StatusChip tone={TONE[r.approvalStatus as Status] ?? "neutral"}>
                      {r.approvalStatus}
                    </StatusChip>
                    {r.reviewNote && (
                      <p className="mt-1 max-w-56 truncate text-xs text-mist" title={r.reviewNote}>
                        “{r.reviewNote}”
                      </p>
                    )}
                  </div>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                cell: (r) => (
                  <div className="flex justify-end gap-2">
                    {r.approvalStatus !== "approved" && (
                      <Button
                        size="sm"
                        aria-label={`Approve ${r.fullName || r.email} (${r.email})`}
                        onClick={() => setReview({ item: r, action: "approve" })}
                      >
                        Approve
                      </Button>
                    )}
                    {r.approvalStatus !== "rejected" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Reject ${r.fullName || r.email} (${r.email})`}
                        onClick={() => setReview({ item: r, action: "reject" })}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </ListPanel>
      <ReviewDialog
        item={review?.item ?? null}
        action={review?.action ?? "approve"}
        onClose={() => setReview(null)}
      />
    </>
  );
}
