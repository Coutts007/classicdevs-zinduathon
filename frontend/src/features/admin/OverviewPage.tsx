import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { ErrorState, SkeletonBlock, StatTile } from "@/components/ui/States";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { env } from "@/lib/env";

const pct = (rate: number | null | undefined) => (rate == null ? "–" : `${Math.round(rate * 100)}%`);
const tooltipStyle = {
  background: "rgba(12,12,17,0.92)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  color: "#f4f4f5",
};

export function AdminOverviewPage() {
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => unwrap(api.GET("/api/v1/admin/stats")),
    refetchInterval: 60_000,
  });
  if (stats.isPending)
    return (
      <GlassPanel className="p-6">
        <SkeletonBlock lines={6} label="Loading stats" />
      </GlassPanel>
    );
  if (stats.isError)
    return (
      <GlassPanel>
        <ErrorState description={userMessage(stats.error)} onRetry={() => stats.refetch()} />
      </GlassPanel>
    );
  const s = stats.data;
  const today = new Date().toISOString().slice(0, 10);
  const analysesToday = s.analysesPerDay.find((d) => d.date === today)?.total ?? 0;
  const perDay = s.analysesPerDay.map((d) => ({
    ...d,
    label: d.date.slice(5),
    failed: d.total - d.completed,
  }));
  const deliveries = Object.entries(s.deliveryRates).map(([channel, r]) => ({
    channel: channel === "sms" ? "SMS" : "Email",
    Delivered: r.ok,
    Failed: r.failed,
    Skipped: r.skipped,
  }));
  // Dict keys are camelised by the API renderer (job_seeker → jobSeeker).
  const byRole = s.usersByRole;
  const seekers = byRole.jobSeeker ?? byRole.job_seeker ?? 0;
  const recruiters = byRole.recruiter ?? 0;
  const admins = byRole.admin ?? 0;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Users"
          value={seekers + recruiters + admins}
          hint={`${plural(seekers, "job seeker", "job seekers")} · ${plural(recruiters, "recruiter", "recruiters")} · ${plural(admins, "admin", "admins")}`}
        />
        <StatTile
          label="Pending recruiters"
          value={
            s.pendingRecruiters ? (
              <Link to="/admin/recruiters" className="text-flare-hot hover:underline">
                {s.pendingRecruiters}
              </Link>
            ) : (
              0
            )
          }
          hint="Waiting for approval"
        />
        <StatTile
          label="Analyses today"
          value={analysesToday}
          hint={`Average Signal Score ${s.averageSignalScore ?? "–"}`}
        />
        <StatTile
          label="Feedback sent"
          value={s.feedbackSent}
          hint={
            s.feedbackHeld ? (
              <Link to="/admin/moderation" className="text-warn hover:underline">
                {s.feedbackHeld} held for review
              </Link>
            ) : (
              "None held for review"
            )
          }
        />
        <StatTile
          label="Email delivery rate"
          value={pct(s.deliveryRates.email?.rate)}
          hint={`${s.deliveryRates.email?.total ?? 0} sent`}
        />
        <StatTile
          label="SMS delivery rate"
          value={pct(s.deliveryRates.sms?.rate)}
          hint={`${s.deliveryRates.sms?.total ?? 0} sent`}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GlassPanel className="p-5">
          <h2 className="text-lg">Analyses per day</h2>
          <p className="text-sm text-mist">Last 14 days</p>
          <div
            className="mt-4 h-60"
            role="img"
            aria-label={`Analyses per day: ${perDay.map((d) => `${d.date} ${d.total}`).join(", ") || "none"}`}
          >
            <ResponsiveContainer>
              <BarChart data={perDay}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgb(160,160,172)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "rgb(160,160,172)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar
                  isAnimationActive={false}
                  dataKey="completed"
                  name="Completed"
                  stackId="a"
                  fill="rgb(255,122,26)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="failed"
                  name="Not completed"
                  stackId="a"
                  fill="rgba(255,255,255,0.22)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <h2 className="text-lg">Deliveries by status</h2>
          <p className="text-sm text-mist">All time, per channel</p>
          <div
            className="mt-4 h-60"
            role="img"
            aria-label={deliveries
              .map((d) => `${d.channel}: ${d.Delivered} delivered, ${d.Failed} failed, ${d.Skipped} skipped`)
              .join("; ")}
          >
            <ResponsiveContainer>
              <BarChart data={deliveries} layout="vertical" margin={{ left: 8 }} barSize={28}>
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "rgb(160,160,172)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="channel"
                  tick={{ fill: "rgb(160,160,172)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar isAnimationActive={false} dataKey="Delivered" stackId="d" fill="rgba(74,222,128,0.75)" />
                <Bar isAnimationActive={false} dataKey="Failed" stackId="d" fill="rgb(248,113,113)" />
                <Bar
                  isAnimationActive={false}
                  dataKey="Skipped"
                  stackId="d"
                  fill="rgba(255,255,255,0.22)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Link to="/admin/deliveries" className="mt-2 inline-block text-sm text-flare-hot hover:underline">
            Open the delivery log
          </Link>
        </GlassPanel>
      </div>
      <GlassPanel className="flex flex-wrap items-center gap-3 p-5">
        <p className="mr-auto text-sm text-mist">Lower-level tools</p>
        <a href={env.djangoAdminUrl} target="_blank" rel="noreferrer">
          <Button variant="glass" size="sm">
            <ShieldCheck aria-hidden className="h-4 w-4" /> Django admin{" "}
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </Button>
        </a>
        <a href={env.apiDocsUrl} target="_blank" rel="noreferrer">
          <Button variant="glass" size="sm">
            <BookOpen aria-hidden className="h-4 w-4" /> API docs{" "}
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </Button>
        </a>
      </GlassPanel>
    </div>
  );
}
