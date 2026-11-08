import { animate, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** The Signal Score: an orange arc fills to the score while the number counts up (once). */
export function ScoreDial({
  score,
  size = 168,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? score : 0);
  useEffect(() => {
    if (reduce) return setShown(score);
    const controls = animate(0, score, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, reduce]);

  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = 0.75; // 270° dial, open at the bottom
  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Signal Score ${score} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[225deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * arc} ${c}`}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#dial)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * arc} ${c}`}
          initial={{ strokeDashoffset: reduce ? c * arc * (1 - score / 100) : c * arc }}
          animate={{ strokeDashoffset: c * arc * (1 - score / 100) }}
          transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: "drop-shadow(0 0 8px rgb(var(--flare) / 0.6))" }}
        />
        <defs>
          <linearGradient id="dial" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--ember))" />
            <stop offset="60%" stopColor="rgb(var(--flare))" />
            <stop offset="100%" stopColor="rgb(var(--flare-hot))" />
          </linearGradient>
        </defs>
      </svg>
      <div aria-hidden className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="tabular text-5xl font-bold leading-none">{shown}</p>
          <p className="mt-1 text-xs text-mist">Signal Score</p>
        </div>
      </div>
    </div>
  );
}
