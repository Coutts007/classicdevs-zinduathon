import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, GitCommit, FolderGit2 } from "lucide-react";
import type { ReactNode } from "react";

import { GlassPanel } from "@/components/glass/Glass";
import { SkeletonBlock, Skeleton } from "@/components/ui/States";
import type { Card } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";

import { ScoreDial } from "./ScoreDial";
import { AiSummary, ClaimsTable, FlagList, SkillList } from "./Skills";
import { SubScoreList, SubScoreRadar } from "./SubScores";

function Panel({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <GlassPanel className="h-full p-5 sm:p-6">
        <h2 className="mb-4 text-lg">{title}</h2>
        {children}
      </GlassPanel>
    </motion.div>
  );
}

/** The full skill card (backend contract §7.1). `aside` holds role-specific actions. */
export function SkillCard({ card, aside, tips }: { card: Card; aside?: ReactNode; tips?: string[] }) {
  const p = card.profile;
  return (
    <div className="space-y-4">
      <GlassPanel glow className="grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
        <ScoreDial score={card.signalScore} />
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <img src={p.avatarUrl} alt="" className="h-12 w-12 rounded-full border border-line" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl">{p.name || p.username}</h1>
              <p className="flex items-center gap-1.5 text-sm text-mist">
                @{p.username}
                {p.verifiedOwner && (
                  <span
                    className="inline-flex items-center gap-1 text-ok"
                    title="Signed in with this GitHub account"
                  >
                    <BadgeCheck aria-hidden className="h-4 w-4" /> verified owner
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <AiSummary text={card.aiSummary} />
          </div>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-mist">
            <span className="inline-flex items-center gap-1.5">
              <FolderGit2 aria-hidden className="h-4 w-4" /> {card.reposAnalysed} repositories
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GitCommit aria-hidden className="h-4 w-4" /> {card.commitsAnalysed} commits
            </span>
            <span>Analysed {fmtDate(card.analysedAt)}</span>
          </p>
        </div>
        {aside && <div className="md:w-56">{aside}</div>}
      </GlassPanel>

      {tips && tips.length > 0 && (
        <GlassPanel className="p-5 sm:p-6">
          <h2 className="text-lg">How to raise your score</h2>
          <ul className="mt-3 space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2 text-ink">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-flare" />
                {tip}
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel title="How the score is built" delay={0.1}>
          <SubScoreRadar subScores={card.subScores} />
          <SubScoreList subScores={card.subScores} />
        </Panel>
        <Panel title="Proven skills" delay={0.18}>
          <SkillList skills={card.skills} />
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Claims checked" delay={0.24}>
          <ClaimsTable claims={card.claims} />
        </Panel>
        <Panel title="Worth a closer look" delay={0.3}>
          <FlagList flags={card.flags} />
        </Panel>
      </div>
    </div>
  );
}

export function SkillCardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading skill card">
      <GlassPanel className="flex gap-6 p-8">
        <Skeleton className="h-40 w-40 rounded-full" />
        <div className="flex-1 space-y-3 pt-4">
          <Skeleton className="h-7 w-1/3" />
          <SkeletonBlock lines={3} />
        </div>
      </GlassPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel className="p-6">
          <SkeletonBlock lines={6} />
        </GlassPanel>
        <GlassPanel className="p-6">
          <SkeletonBlock lines={6} />
        </GlassPanel>
      </div>
    </div>
  );
}
