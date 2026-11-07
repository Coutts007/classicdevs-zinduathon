import { motion } from "framer-motion";
import { useId } from "react";

import { cn } from "@/lib/utils";

/** Glass segmented control with a sliding indicator (keyboard: arrow keys via radio group). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="glass-pill inline-flex rounded-full p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition",
              active ? "text-black" : "text-mist hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-flare"
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
