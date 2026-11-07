import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Eye, Inbox, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";

import { GlassPanel } from "@/components/glass/Glass";
import { TierBadge, type Tier } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/States";
import { ScoreDial } from "@/features/card/ScoreDial";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-context";
import { ago, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function useDashboard() {
  const analyses = useQuery({
    queryKey: qk.analyses(1),
    queryFn: () => unwrap(api.GET("/api/v1/analyses", { params: { query: { page: 1, pageSize: 20 } } })),
  });
  const completed = (analyses.data?.results ?? []).filter((a) => a.status === "completed");
  const latestId = completed[0]?.id;
  const latest = useQuery({
    queryKey: qk.analysis(latestId ?? "none"),
    queryFn: () =>
      unwrap(api.GET("/api/v1/analyses/{public_id}", { params: { path: { public_id: latestId! } } })),
    enabled: Boolean(latestId),
  });
  const feedback = useQuery({
    queryKey: qk.feedback(1, 3),
    queryFn: () => unwrap(api.GET("/api/v1/feedback", { params: { query: { page: 1, pageSize: 3 } } })),
  });
  const views = useQuery({
    queryKey: qk.profileViews,
    queryFn: () => unwrap(api.GET("/api/v1/me/profile-views")),
  });
  return { analyses, completed, latest, feedback, views };
}

export function DashboardPage() {
  const { user } = useAuth();
  const { analyses, completed, latest, feedback, views } = useDashboard();

  if (!user?.github || (analyses.isSuccess && completed.length === 0)) {
    return (
      <GlassPanel glow className="p-2">
        <EmptyState
          icon={<Sparkles aria-hidden className="h-5 w-5 text-flare-hot" />}
          title={user?.github ? "Run your first analysis" : "Connect GitHub to get your skill card"}
          description="We read your public repositories and show recruiters the evidence behind every skill."
          action={
            <Link to="/app/analyse">
              <Button size="lg">{user?.github ? "Analyse my GitHub" : "Connect GitHub"}</Button>
            </Link>
          }
        />
      </GlassPanel>
    );
  }
  if (analyses.isError)
    return (
      <GlassPanel>
        <ErrorState description={userMessage(analyses.error)} onRetry={() => analyses.refetch()} />
      </GlassPanel>
    );

  const [now, before] = completed;
  const delta =
    now?.signalScore != null && before?.signalScore != null ? now.signalScore - before.signalScore : null;
  const card = latest.data?.card;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassPanel glow className="flex flex-col items-center gap-4 p-6 text-center lg:row-span-2">
        {analyses.isPending || !now ? (
          <SkeletonBlock lines={4} label="Loading your score" />
        ) : (
          <>
            <ScoreDial score={now.signalScore ?? 0} />
            <p className="text-sm text-mist">
              {delta === null ? (
                "Your first score"
              ) : delta === 0 ? (
                "No change since last analysis"
              ) : (
                <span className={delta > 0 ? "text-ok" : "text-bad"}>
                  {delta > 0 ? `+${delta}` : delta} since last analysis
                </span>
              )}
              <br />
              Analysed {fmtDate(now.completedAt)}
            </p>
            <div className="flex w-full flex-col gap-2">
              <Link to="/app/analyse">
                <Button className="w-full">Run analysis</Button>
              </Link>
              <Link to="/app/card">
                <Button variant="glass" className="w-full">
                  View my card
                </Button>
              </Link>
            </div>
          </>
        )}
      </GlassPanel>

      <GlassPanel className="p-6">
        <h2 className="text-lg">Top skills</h2>
        {latest.isPending ? (
          <SkeletonBlock lines={3} />
        ) : card?.skills.length ? (
          <ul className="mt-3 space-y-2">
            {card.skills.slice(0, 5).map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-2">
                <span>{s.name}</span>
                <TierBadge tier={s.label as Tier} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mist">No skills detected yet.</p>
        )}
      </GlassPanel>

      <GlassPanel className="p-6">
        <h2 className="text-lg">How to improve</h2>
        {latest.data?.tips.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {latest.data.tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flare" />
                {t}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mist">
            {latest.isPending ? "Loading…" : "Nothing to suggest right now. Nice."}
          </p>
        )}
      </GlassPanel>

      <GlassPanel className="p-6 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Recent feedback</h2>
          <Link
            to="/app/inbox"
            className="inline-flex items-center gap-1 text-sm text-flare-hot hover:underline"
          >
            Inbox <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>
        {feedback.isPending ? (
          <SkeletonBlock lines={3} />
        ) : feedback.data?.results.length ? (
          <ul className="mt-3 space-y-3">
            {[...feedback.data.results]
              .sort((a, b) => Number(Boolean(a.readAt)) - Number(Boolean(b.readAt)))
              .map((f) => (
                <li key={f.id} className="flex gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-2 h-2 w-2 shrink-0 rounded-full",
                      f.readAt ? "bg-white/15" : "bg-flare shadow-[0_0_8px_rgb(var(--flare))]",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.company}</p>
                    <p className="truncate text-sm text-mist">{f.message}</p>
                    <p className="text-xs text-mist">{ago(f.createdAt)}</p>
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-sm text-mist">
            <Inbox aria-hidden className="h-4 w-4" /> No feedback yet. Share your card to get noticed.
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="p-6 lg:col-span-1">
        <h2 className="flex items-center gap-2 text-lg">
          <Eye aria-hidden className="h-4 w-4 text-flare-hot" /> Profile views
        </h2>
        {views.isPending ? (
          <SkeletonBlock lines={2} />
        ) : (
          <>
            <p className="mt-2 text-sm text-mist">
              <span className="tabular text-2xl font-bold text-ink">{views.data?.thisWeek ?? 0}</span>{" "}
              recruiters this week
            </p>
            <div
              className="mt-3 h-24"
              role="img"
              aria-label={`Recruiters per week: ${(views.data?.weeks ?? []).map((w) => w.recruiters).join(", ") || "none yet"}`}
            >
              <ResponsiveContainer>
                <BarChart
                  data={(views.data?.weeks ?? []).map((w) => ({
                    week: fmtDate(w.weekStart).slice(0, 6),
                    n: w.recruiters,
                  }))}
                >
                  <XAxis
                    dataKey="week"
                    tick={{ fill: "rgb(160,160,172)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Bar dataKey="n" fill="rgb(255,122,26)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </GlassPanel>
    </div>
  );
}
