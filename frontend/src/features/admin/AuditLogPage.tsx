import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { Field, Input } from "@/components/ui/Field";
import { api, unwrap } from "@/lib/api/client";
import { format } from "date-fns";

import { JsonView, ListPanel } from "./parts";
import { useUrlState } from "./url-state";

/** Date inputs give yyyy-mm-dd; the API takes ISO date-times. "Until" includes that whole day. */
const startOf = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined);
const endOf = (d: string) => (d ? new Date(`${d}T23:59:59`).toISOString() : undefined);

function useDebounced(key: string, url: ReturnType<typeof useUrlState>) {
  const [text, setText] = useState(url.get(key));
  useEffect(() => {
    const t = setTimeout(() => text.trim() !== url.get(key) && url.set({ [key]: text.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on typing only
  }, [text]);
  return [text, setText] as const;
}

export function AuditLogPage() {
  const url = useUrlState();
  const { get, page, set, setPage } = url;
  const [actor, setActor] = useDebounced("actor", url);
  const [action, setAction] = useDebounced("action", url);
  const [open, setOpen] = useState<number | null>(null);
  const list = useQuery({
    queryKey: ["admin", "audit", get("actor"), get("action"), get("since"), get("until"), page],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/admin/audit-log", {
          params: {
            query: {
              page,
              ...(get("actor") ? { actor: get("actor") } : {}),
              ...(get("action") ? { action: get("action") } : {}),
              ...(get("since") ? { since: startOf(get("since")) } : {}),
              ...(get("until") ? { until: endOf(get("until")) } : {}),
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  return (
    <ListPanel
      query={list}
      page={page}
      onPage={(p) => {
        setOpen(null);
        setPage(p);
      }}
      empty={{
        title: "Nothing logged for these filters",
        description: "Widen the date range or clear a filter.",
      }}
      toolbar={
        <>
          <Field label="Actor" className="w-full sm:w-56">
            {({ id }) => (
              <Input id={id} placeholder="Email" value={actor} onChange={(e) => setActor(e.target.value)} />
            )}
          </Field>
          <Field label="Action" hint="Exact, or a prefix ending in “.”" className="w-full sm:w-56">
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. auth. or admin.user_suspended"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            )}
          </Field>
          <Field label="From">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={get("since")}
                onChange={(e) => set({ since: e.target.value })}
              />
            )}
          </Field>
          <Field label="Until">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={get("until")}
                onChange={(e) => set({ until: e.target.value })}
              />
            )}
          </Field>
        </>
      }
    >
      {(rows) => (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Audit log</caption>
            <thead>
              <tr className="border-b border-line text-mist">
                <th scope="col" className="w-8 px-2 py-2.5">
                  <span className="sr-only">Details</span>
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  When
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Actor
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Action
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Target
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.map((r, i) => (
                <Fragment key={`${r.createdAt}-${i}`}>
                  <tr className="hover:bg-white/[0.03]">
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        aria-expanded={open === i}
                        aria-label={`Metadata for ${r.action}`}
                        onClick={() => setOpen(open === i ? null : i)}
                        className="grid h-7 w-7 place-items-center rounded-full text-mist hover:bg-white/10 hover:text-ink"
                      >
                        {open === i ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular">
                      {format(new Date(r.createdAt), "d MMM yyyy HH:mm:ss")}
                    </td>
                    <td className="px-3 py-2">{r.actor ?? <span className="text-mist">system</span>}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                    <td className="px-3 py-2 text-xs text-mist">
                      {r.targetType ? `${r.targetType} ${r.targetId ?? ""}` : "–"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-mist">{r.ipAddress ?? "–"}</td>
                  </tr>
                  {open === i && (
                    <tr>
                      <td />
                      <td colSpan={5} className="px-3 pb-3">
                        <JsonView value={r.metadata} label={`Metadata for ${r.action}`} />
                        {r.userAgent && <p className="mt-1 truncate text-xs text-mist">{r.userAgent}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ListPanel>
  );
}
