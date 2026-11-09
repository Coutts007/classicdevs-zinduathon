import type { Card, SubScoreKey } from "@/lib/api/types";
import { SUB_SCORE_LABELS } from "@/lib/format";

const KEYS: SubScoreKey[] = ["consistency", "iteration", "quality", "breadth", "ownership"];

/**
 * Five-axis radar as plain SVG. The public card is a landing page for recruiters, so it must not
 * pull in a charting library (≈100 KB gzipped) for one shape.
 */
export function SubScoreRadar({ subScores }: { subScores: Card["subScores"] }) {
  const data = KEYS.map((k) => ({ key: SUB_SCORE_LABELS[k], value: subScores[k]?.value ?? 0 }));
  const size = 260;
  const c = size / 2;
  const r = 78;
  const point = (i: number, f: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / KEYS.length;
    return [c + Math.cos(angle) * r * f, c + Math.sin(angle) * r * f] as const;
  };
  const ring = (f: number) => KEYS.map((_, i) => point(i, f).join(",")).join(" ");
  const shape = data.map((d, i) => point(i, Math.max(0, Math.min(20, d.value)) / 20).join(",")).join(" ");
  return (
    <div
      className="flex h-56 w-full items-center justify-center"
      role="img"
      aria-label={`Sub-scores: ${data.map((d) => `${d.key} ${d.value} of 20`).join(", ")}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full max-w-full overflow-visible" aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke="rgba(255,255,255,0.12)" />
        ))}
        {KEYS.map((_, i) => {
          const [x, y] = point(i, 1);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" />;
        })}
        <polygon points={shape} fill="rgb(255 122 26 / 0.28)" stroke="rgb(255,122,26)" strokeWidth={1.5} />
        {data.map((d, i) => {
          const [x, y] = point(i, 1.22);
          const anchor = Math.abs(x - c) < 4 ? "middle" : x > c ? "start" : "end";
          return (
            <text
              key={d.key}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={12}
              fill="rgb(160,160,172)"
            >
              {d.key}
            </text>
          );
        })}
      </svg>
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
