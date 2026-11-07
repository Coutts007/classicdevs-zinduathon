import * as Switch from "@radix-ui/react-switch";
import { useId } from "react";

/** A labelled switch row: label + description on the left, the switch on the right. */
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="block cursor-pointer font-medium">
          {label}
        </label>
        <p id={`${id}-desc`} className="text-sm text-mist">
          {description}
        </p>
      </div>
      <Switch.Root
        id={id}
        aria-describedby={`${id}-desc`}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="relative mt-1 h-6 w-11 shrink-0 rounded-full border border-line bg-white/10 transition data-[state=checked]:border-flare data-[state=checked]:bg-flare"
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}
