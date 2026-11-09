import { Check, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { GlassCard } from "@/components/glass/Glass";
import { TierBadge, type Tier } from "@/components/ui/Badge";
import type { Candidate, Match } from "@/lib/api/types";
import { ago } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Avatar({ src, name, className }: { src?: string; name: string; className?: string }) {
  return src ? (
    <img src={src} alt="" className={cn("h-11 w-11 shrink-0 rounded-full border border-line", className)} />
  ) : (
    <span
      aria-hidden
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-white/5 text-sm font-semibold text-flare-hot",
        className,
      )}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Score ring-less number: big tabular figure with a thin bar under it. */
export function ScoreFigure({ value, label = "Signal Score" }: { value: number; label?: string }) {
  return (
    <div className="w-16 shrink-0 text-right" aria-label={`${label} ${value}`}>
      <p className="tabular text-2xl font-bold leading-none">{value}</p>
      <div aria-hidden className="mt-1.5 h-1 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-flare" style={{ width: `${Math.max(4, value)}%` }} />
      </div>
    </div>
  );
}

/** One floating search result. `match` adds the job-match chips; `actions` sit on the right. */
export function CandidateRow({
  candidate,
  match,
  actions,
}: {
  candidate: Candidate;
  match?: Match;
  actions?: ReactNode;
}) {
  const c = candidate;
  return (
    <GlassCard className="flex flex-wrap items-center gap-4 p-4 transition hover:border-flare/40 sm:flex-nowrap">
      <Avatar src={c.avatarUrl} name={c.name || c.githubLogin} />
      <div className="min-w-0 flex-1">
        <Link
          to={`/recruiter/candidates/${c.githubLogin}`}
          className="font-semibold after:absolute after:inset-0 after:rounded-[inherit] hover:text-flare-hot"
        >
          {c.name || c.githubLogin}
        </Link>
        <p className="truncate text-sm text-mist">
          @{c.githubLogin}
          {c.headline && <> · {c.headline}</>}
          {c.location && <> · {c.location}</>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {c.topSkills.slice(0, 3).map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-sm">
              {s.name} <TierBadge tier={s.label as Tier} className="h-5 px-2 text-[11px]" />
            </span>
          ))}
          {c.openToWork && <span className="text-xs text-ok">· Open to work</span>}
        </div>
        {match && <MatchChips match={match} className="mt-2" />}
      </div>
      <div className="flex items-center gap-4">
        {match ? <ScoreFigure value={match.score} label="Match" /> : <ScoreFigure value={c.signalScore} />}
        <p className="hidden w-24 text-right text-xs text-mist md:block">Analysed {ago(c.analysedAt)}</p>
        {actions && <div className="relative z-10 flex gap-2">{actions}</div>}
      </div>
    </GlassCard>
  );
}

/** Met / partly met / missing skills, never colour alone (icon + text). */
export function MatchChips({ match, className }: { match: Match; className?: string }) {
  const chip = "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs";
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Skill match">
      {match.met.map((s) => (
        <li key={`m-${s}`} className={cn(chip, "border-ok/50 text-ok")}>
          <Check aria-hidden className="h-3 w-3" /> {s}
        </li>
      ))}
      {match.partial.map((s) => (
        <li key={`p-${s}`} className={cn(chip, "border-warn/50 text-warn")}>
          <Minus aria-hidden className="h-3 w-3" /> {s} <span className="sr-only">(partly met)</span>
        </li>
      ))}
      {match.missing.map((s) => (
        <li key={`x-${s}`} className={cn(chip, "border-dashed border-bad/60 text-bad")}>
          <X aria-hidden className="h-3 w-3" /> {s} <span className="sr-only">(missing)</span>
        </li>
      ))}
    </ul>
  );
}
