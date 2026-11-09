import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, RotateCw, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import type { Delivery, DeliveryStatus } from "@/lib/api/types";
import { ago, fmtDate } from "@/lib/format";

import { JsonView, ListPanel } from "./parts";
import { useUrlState } from "./url-state";

const DELIVERY_STATUS: Record<
  DeliveryStatus,
  { label: string; tone: "neutral" | "ok" | "warn" | "bad" | "flare" }
> = {
  queued: { label: "Queued", tone: "neutral" },
  sent: { label: "Sent", tone: "flare" },
  delivered: { label: "Delivered", tone: "ok" },
  failed: { label: "Failed", tone: "bad" },
  skipped: { label: "Skipped", tone: "neutral" },
  dry_run: { label: "Dry run", tone: "warn" },
};

function useRetry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.POST("/api/v1/admin/notification-deliveries/{public_id}/retry", {
          params: { path: { public_id: id } },
        }),
      ),
    onSuccess: () => {
      toast("Queued for another try");
      void client.invalidateQueries({ queryKey: ["admin", "deliveries"] });
    },
    onError: (e) => toast.error(userMessage(e)),
  });
}

function Detail({ d, onClose }: { d: Delivery | null; onClose: () => void }) {
  const retry = useRetry();
  return (
    <Dialog
      open={Boolean(d)}
      onOpenChange={(o) => !o && onClose()}
      title={d?.title || "Delivery"}
      className="w-[min(94vw,640px)]"
    >
      {d && (
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-mist">Kind</dt>
            <dd>{d.kind}</dd>
            <dt className="text-mist">User</dt>
            <dd>{d.user}</dd>
            <dt className="text-mist">Recipient</dt>
            <dd className="font-mono text-xs">{d.recipient || "–"}</dd>
            <dt className="text-mist">Channel</dt>
            <dd>
              {d.channel === "sms" ? "SMS" : "Email"} via {d.provider}
            </dd>
            <dt className="text-mist">Status</dt>
            <dd>
              <StatusChip tone={DELIVERY_STATUS[d.status ?? "queued"].tone}>
                {DELIVERY_STATUS[d.status ?? "queued"].label}
              </StatusChip>{" "}
              <span className="text-mist">after {d.attempts ?? 0} attempt(s)</span>
            </dd>
            <dt className="text-mist">Created</dt>
            <dd>{fmtDate(d.createdAt)}</dd>
            {d.sentAt && (
              <>
                <dt className="text-mist">Sent</dt>
                <dd>{ago(d.sentAt)}</dd>
              </>
            )}
            {d.deliveredAt && (
              <>
                <dt className="text-mist">Delivered</dt>
                <dd>{ago(d.deliveredAt)}</dd>
              </>
            )}
            {d.providerMessageId && (
              <>
                <dt className="text-mist">Provider ID</dt>
                <dd className="break-all font-mono text-xs">{d.providerMessageId}</dd>
              </>
            )}
          </dl>
          {d.lastError && (
            <p className="rounded-xl border border-bad/30 bg-bad/[0.06] px-3 py-2 text-bad">{d.lastError}</p>
          )}
          <div>
            <p className="mb-1 font-medium">Message</p>
            <p className="whitespace-pre-line rounded-xl border border-line px-3 py-2 text-mist">
              {d.body || "–"}
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium">Provider response</p>
            <JsonView value={d.providerResponse} label="Provider response JSON" />
          </div>
          {d.status === "failed" && (
            <Button loading={retry.isPending} onClick={() => retry.mutate(d.id!, { onSuccess: onClose })}>
              <RotateCw aria-hidden className="h-4 w-4" /> Retry
            </Button>
          )}
        </div>
      )}
    </Dialog>
  );
}

export function DeliveriesPage() {
  const { get, page, set, setPage } = useUrlState();
  const channel = get("channel") as "email" | "sms" | "";
  const status = get("status") as DeliveryStatus | "";
  const provider = get("provider") as "smtp" | "thrivewave" | "";
  const list = useQuery({
    queryKey: ["admin", "deliveries", channel, status, provider, page],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/admin/notification-deliveries", {
          params: {
            query: {
              page,
              ...(channel ? { channel } : {}),
              ...(status ? { status } : {}),
              ...(provider ? { provider } : {}),
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const retry = useRetry();
  const [open, setOpen] = useState<Delivery | null>(null);
  return (
    <>
      <ListPanel
        query={list}
        page={page}
        onPage={setPage}
        empty={{
          title: "No deliveries match",
          description: "Emails and SMS appear here as notifications go out.",
        }}
        toolbar={
          <>
            <Select
              aria-label="Channel"
              value={channel}
              onChange={(e) => set({ channel: e.target.value })}
              className="w-36"
            >
              <option value="">All channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </Select>
            <Select
              aria-label="Status"
              value={status}
              onChange={(e) => set({ status: e.target.value })}
              className="w-40"
            >
              <option value="">Any status</option>
              {Object.entries(DELIVERY_STATUS).map(([v, s]) => (
                <option key={v} value={v}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Provider"
              value={provider}
              onChange={(e) => set({ provider: e.target.value })}
              className="w-40"
            >
              <option value="">Any provider</option>
              <option value="smtp">SMTP</option>
              <option value="thrivewave">Thrivewave</option>
            </Select>
          </>
        }
      >
        {(rows) => (
          <DataTable
            caption="Notification deliveries"
            rows={rows}
            rowKey={(d) => d.id!}
            columns={[
              {
                key: "what",
                header: "Notification",
                cell: (d) => (
                  <button type="button" onClick={() => setOpen(d)} className="text-left hover:text-flare-hot">
                    <span className="flex items-center gap-1.5 font-medium">
                      {d.channel === "sms" ? (
                        <Smartphone aria-hidden className="h-4 w-4 text-mist" />
                      ) : (
                        <Mail aria-hidden className="h-4 w-4 text-mist" />
                      )}
                      <span className="max-w-64 truncate">{d.title || d.kind}</span>
                    </span>
                    <span className="block text-xs text-mist">{d.kind}</span>
                  </button>
                ),
              },
              {
                key: "to",
                header: "To",
                cell: (d) => <span className="font-mono text-xs">{d.recipient || "–"}</span>,
              },
              { key: "provider", header: "Provider", sortValue: (d) => d.provider, cell: (d) => d.provider },
              {
                key: "status",
                header: "Status",
                sortValue: (d) => d.status,
                cell: (d) => (
                  <span title={d.lastError || undefined}>
                    <StatusChip tone={DELIVERY_STATUS[d.status ?? "queued"].tone}>
                      {DELIVERY_STATUS[d.status ?? "queued"].label}
                    </StatusChip>
                  </span>
                ),
              },
              {
                key: "when",
                header: "Created",
                sortValue: (d) => d.createdAt,
                cell: (d) => ago(d.createdAt),
              },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                cell: (d) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpen(d)}
                      aria-label={`Details for ${d.title || d.kind} to ${d.recipient}`}
                    >
                      Details
                    </Button>
                    {d.status === "failed" && (
                      <Button
                        size="sm"
                        variant="glass"
                        loading={retry.isPending && retry.variables === d.id}
                        onClick={() => retry.mutate(d.id!)}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </ListPanel>
      <Detail d={open} onClose={() => setOpen(null)} />
    </>
  );
}
