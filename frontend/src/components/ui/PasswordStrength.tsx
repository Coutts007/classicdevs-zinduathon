import { passwordScore } from "@/lib/password";
import { cn } from "@/lib/utils";

const LABELS = ["", "Weak", "Fair", "Good", "Strong"];

export function PasswordStrength({ value }: { value: string }) {
  const score = passwordScore(value);
  if (!value) return null;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full bg-white/10 transition-colors",
              i <= score && (score <= 1 ? "bg-bad" : score === 2 ? "bg-warn" : "bg-ok"),
            )}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-mist">Password strength: {LABELS[score]}</p>
    </div>
  );
}
