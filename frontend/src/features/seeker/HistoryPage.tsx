import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { GlassPanel } from "@/components/glass/Glass";
import { StatusChip } from "@/components/ui/Badge";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/States";
import { SkillCard } from "@/features/card/SkillCard";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import type { AnalysisListItem } from "@/lib/api/types";
import { fmtDate, SUB_SCORE_LABELS } from "@/lib/format";

function Delta({ now, before }: { now: number; before?: number }) {
  if (before === undefined) return null;
  const d = now - before;
  if (!d) return <span className="text-mist">±0</span>;
  return <span className={d > 0 ? "text-ok" : "text-bad"}>{d > 0 ? `+${d}` : d}</span>;
}

/** Score over time: proof of iteration. */
export function HistoryPage() {
  const list = useQuery({
    queryKey: qk.analyses(1),
    queryFn: () => unwrap(api.GET("/api/v1/analyses", { params: { query: { page: 1, pageSize: 50 } } })),
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: qk.analysis(openId ?? "none"),
    queryFn: () =>
      unwrap(api.GET("/api/v1/analyses/{public_id}", { params: { path: { public_id: openId! } } })),
    enabled: Boolean(openId),
  });

  if (list.isPending)
    return (
      <GlassPanel className="p-6">
        <SkeletonBlock lines={6} label="Loading history" />
      </GlassPanel>
    );
  if (list.isError)
    return (
      <GlassPanel>
        <ErrorState description={userMessage(list.error)} onRetry={() => list.refetch()} />
      </GlassPanel>
    );
  const completed = list.data.results.filter((a) => a.status === "completed" && a.signalScore !== null);
  if (!list.data.results.length)
    return (
      <GlassPanel>
        <EmptyState
          title="No analyses yet"
          description="Your score history starts with your first analysis."
        />
      </GlassPanel>
    );

  const chart = [...completed].reverse().map((a) => ({ date: fmtDate(a.completedAt), score: a.signalScore }));
  const prevOf = (a: AnalysisListItem) => completed[completed.indexOf(a) + 1];

  return (
    <div className="space-y-4">
      <GlassPanel glow className="p-6">
        <h2 className="text-lg">Signal Score over time</h2>
        <div
          className="mt-4 h-56"
          role="img"
          aria-label={`Scores: ${chart.map((c) => `${c.date} ${c.score}`).join(", ")}`}
        >
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ left: -20, right: 10, top: 10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgb(160,160,172)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "rgb(160,160,172)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(12,12,17,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="rgb(255,122,26)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "rgb(255,177,92)" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
      <GlassPanel className="p-2 sm:p-4">
        <ul className="divide-y divide-white/[0.06]">
          {list.data.results.map((a) => {
            const prev = prevOf(a);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  aria-expanded={openId === a.id}
                  className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-3 py-3 text-left hover:bg-white/[0.03]"
                >
                  <span className="w-28 text-sm text-mist">{fmtDate(a.completedAt ?? a.createdAt)}</span>
                  {a.status === "completed" ? (
                    <span className="tabular w-24 font-semibold">
                      {a.signalScore}{" "}
                      <span className="text-sm font-normal">
                        <Delta now={a.signalScore ?? 0} before={prev?.signalScore ?? undefined} />
                      </span>
                    </span>
                  ) : (
                    <StatusChip tone={a.status === "failed" ? "bad" : "warn"}>{a.status}</StatusChip>
                  )}
                  <span className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm text-mist">
                    {Object.entries(a.subScores).map(([k, v]) => (
                      <span key={k}>
                        {SUB_SCORE_LABELS[k as keyof typeof SUB_SCORE_LABELS] ?? k}{" "}
                        <span className="tabular text-ink">{v}</span>{" "}
                        {prev && <Delta now={v} before={prev.subScores[k]} />}
                      </span>
                    ))}
                  </span>
                </button>
                {openId === a.id && (
                  <div className="px-1 pb-4">
                    {detail.isPending ? (
                      <SkeletonBlock lines={3} />
                    ) : detail.data?.card ? (
                      <SkillCard card={detail.data.card} />
                    ) : (
                      <p className="px-3 text-sm text-mist">
                        {detail.data?.errorMessage || "No card for this run."}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </GlassPanel>
    </div>
  );
}
