import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";

import type { Card, SubScoreKey } from "@/lib/api/types";
import { SUB_SCORE_LABELS } from "@/lib/format";

const KEYS: SubScoreKey[] = ["consistency", "iteration", "quality", "breadth", "ownership"];

export function SubScoreRadar({ subScores }: { subScores: Card["subScores"] }) {
  const data = KEYS.map((k) => ({ key: SUB_SCORE_LABELS[k], value: subScores[k]?.value ?? 0 }));
  return (
    <div
      className="h-56 w-full"
      role="img"
      aria-label={`Sub-scores: ${data.map((d) => `${d.key} ${d.value} of 20`).join(", ")}`}
    >
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis dataKey="key" tick={{ fill: "rgb(160,160,172)", fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 20]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="rgb(255,122,26)"
            fill="rgb(255,122,26)"
            fillOpacity={0.28}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Every number with its rule-based reason: the card's "show your working". */
export function SubScoreList({ subScores }: { subScores: Card["subScores"] }) {
  return (
    <ul className="space-y-3">
      {KEYS.map((k) => {
        const s = subScores[k];
        return (
          <li key={k}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{SUB_SCORE_LABELS[k]}</span>
              <span className="tabular text-sm text-mist">
                <span className="font-semibold text-ink">{s?.value ?? 0}</span> / 20
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.07]" aria-hidden>
              <div
                className="h-full rounded-full bg-flare shadow-[0_0_10px_rgb(var(--flare)/0.6)]"
                style={{ width: `${((s?.value ?? 0) / 20) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-mist">{s?.reason}</p>
          </li>
        );
      })}
    </ul>
  );
}
