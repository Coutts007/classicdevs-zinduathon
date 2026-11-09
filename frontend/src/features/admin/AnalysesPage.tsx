import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { StatusChip } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/Field";
import { api, unwrap } from "@/lib/api/client";
import { ago, fmtDate } from "@/lib/format";

import { ListPanel } from "./parts";
import { PAGE_SIZE, useUrlState } from "./url-state";

const STATUS = {
  queued: "neutral",
  running: "flare",
  completed: "ok",
  failed: "bad",
} as const;

function duration(start: string, end: string | null) {
  if (!end) return "–";
  const s = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function AdminAnalysesPage() {
  const { get, page, set, setPage } = useUrlState();
  const [login, setLogin] = useState(get("login"));
  useEffect(() => {
    const t = setTimeout(() => login.trim() !== get("login") && set({ login: login.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on typing only
  }, [login]);
  const status = get("status");
  const list = useQuery({
    queryKey: ["admin", "analyses", get("login"), status, page],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/analyses", {
          params: {
            query: {
              page,
              pageSize: PAGE_SIZE,
              ...(get("login") ? { githubLogin: get("login") } : {}),
              ...(status ? { status: status as keyof typeof STATUS } : {}),
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
  return (
    <ListPanel
      query={list}
      page={page}
      onPage={setPage}
      empty={{ title: "No analyses", description: "Analyses appear here as soon as someone runs one." }}
      toolbar={
        <>
          <Input
            type="search"
            aria-label="GitHub login"
            placeholder="GitHub login (exact)"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select
            aria-label="Status"
            value={status}
            onChange={(e) => set({ status: e.target.value })}
            className="w-40"
          >
            <option value="">Any status</option>
            {Object.keys(STATUS).map((s) => (
              <option key={s} value={s}>
                {s[0]!.toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </>
      }
    >
      {(rows) => (
        <DataTable
          caption="Analyses"
          rows={rows}
          rowKey={(a) => a.id}
          columns={[
            {
              key: "login",
              header: "GitHub login",
              sortValue: (a) => a.githubLogin,
              cell: (a) => <span className="font-medium">@{a.githubLogin}</span>,
            },
            {
              key: "status",
              header: "Status",
              sortValue: (a) => a.status,
              cell: (a) => (
                <StatusChip tone={STATUS[a.status as keyof typeof STATUS] ?? "neutral"}>
                  {a.status}
                </StatusChip>
              ),
            },
            {
              key: "score",
              header: "Score",
              sortValue: (a) => a.signalScore ?? -1,
              cell: (a) => <span className="tabular">{a.signalScore ?? "–"}</span>,
            },
            {
              key: "started",
              header: "Started",
              sortValue: (a) => a.createdAt,
              cell: (a) => <span title={fmtDate(a.createdAt)}>{ago(a.createdAt)}</span>,
            },
            {
              key: "duration",
              header: "Duration",
              cell: (a) => <span className="tabular">{duration(a.createdAt, a.completedAt)}</span>,
            },
            {
              key: "open",
              header: "Card",
              className: "text-right",
              cell: (a) =>
                a.status === "completed" ? (
                  <Link
                    to={`/u/${a.githubLogin}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-flare-hot hover:underline"
                  >
                    Open <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                    <span className="sr-only">card for {a.githubLogin} (new tab)</span>
                  </Link>
                ) : (
                  "–"
                ),
            },
          ]}
        />
      )}
    </ListPanel>
  );
}
