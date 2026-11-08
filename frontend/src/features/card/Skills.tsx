import { ChevronDown, ExternalLink, FlaskConical, Workflow } from "lucide-react";
import { useState } from "react";

import { ClaimBadge, TierBadge, type ClaimStatus, type Tier } from "@/components/ui/Badge";
import type { Card, CardSkill } from "@/lib/api/types";
import { fmtMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

function EvidencePanel({ skill }: { skill: CardSkill }) {
  return (
    <ul className="mt-3 space-y-2">
      {skill.repos.map((repo) => (
        <li
          key={repo.url}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white/[0.03] px-3 py-2 text-sm"
        >
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-ink hover:text-flare-hot"
          >
            {repo.name}
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </a>
          <span className="tabular text-mist">{repo.commits} commits</span>
          <span className="text-mist">
            {fmtMonth(repo.firstCommit)} – {fmtMonth(repo.lastCommit)}
          </span>
          {repo.hasTests && (
            <span className="inline-flex items-center gap-1 text-ok">
              <FlaskConical aria-hidden className="h-3.5 w-3.5" /> tests
            </span>
          )}
          {repo.hasCI && (
            <span className="inline-flex items-center gap-1 text-ok">
              <Workflow aria-hidden className="h-3.5 w-3.5" /> CI
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SkillList({ skills }: { skills: CardSkill[] }) {
  const [open, setOpen] = useState<string | null>(skills[0]?.name ?? null);
  if (!skills.length)
    return <p className="text-mist">No skills detected yet. Push some code and run the analysis again.</p>;
  return (
    <ul className="divide-y divide-white/[0.06]">
      {skills.map((skill) => {
        const isOpen = open === skill.name;
        return (
          <li key={skill.name} className="py-3">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : skill.name)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="flex-1">
                <span className="font-medium">{skill.name}</span>
                <span className="ml-2 text-xs text-mist">{skill.category}</span>
              </span>
              <span className="tabular hidden text-sm text-mist sm:inline">
                evidence {skill.evidence.toFixed(2)}
              </span>
              <TierBadge tier={skill.label as Tier} />
              <ChevronDown
                aria-hidden
                className={cn("h-4 w-4 text-mist transition", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && <EvidencePanel skill={skill} />}
          </li>
        );
      })}
    </ul>
  );
}

export function ClaimsTable({ claims }: { claims: Card["claims"] }) {
  if (!claims.length) return <p className="text-sm text-mist">No CV claims to check.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {claims.map((c) => (
        <li key={c.skill} className="glass-pill flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-sm">
          {c.skill}
          <ClaimBadge status={c.status as ClaimStatus} />
        </li>
      ))}
    </ul>
  );
}

const FLAG_TITLE: Record<string, string> = {
  one_shot_dump: "Mostly one commit",
  unexplained_bulk: "Large unexplained commit",
  tutorial_clone: "Looks like a tutorial",
  unverified_claim: "Claim without public evidence",
};

/** Prompts to check, never accusations. */
export function FlagList({ flags }: { flags: Card["flags"] }) {
  if (!flags.length) return <p className="text-sm text-mist">Nothing to check: no noise flags.</p>;
  return (
    <ul className="space-y-2">
      {flags.map((f, i) => (
        <li key={i} className="rounded-xl border border-warn/20 bg-warn/[0.06] px-4 py-3 text-sm">
          <p className="font-medium text-warn">
            {FLAG_TITLE[f.type] ?? "Worth a closer look"}
            {f.repo && <span className="text-mist"> · {f.repo}</span>}
          </p>
          <p className="mt-1 text-mist">{f.reason}</p>
        </li>
      ))}
    </ul>
  );
}

export function AiSummary({ text }: { text: string }) {
  return (
    <figure>
      <blockquote className="text-lg leading-relaxed text-ink">{text}</blockquote>
      <figcaption className="mt-2 text-xs text-mist">
        Written by AI from the numbers below; it never sets a score.
      </figcaption>
    </figure>
  );
}
