import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import { api, unwrap } from "@/lib/api/client";
import { qk } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";

/**
 * Claimed-skills editor: type, pick from the catalogue (names and aliases) or press Enter for
 * free text. Max `max` chips; duplicates (case-insensitive) are ignored.
 */
export function ChipInput({
  value,
  onChange,
  max = 12,
  label = "Skills on your CV",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
  label?: string;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const search = text.trim();
  const { data } = useQuery({
    queryKey: qk.skills(search),
    queryFn: () => unwrap(api.GET("/api/v1/skills", { params: { query: { search, pageSize: 8 } } })),
    enabled: search.length >= 1,
    staleTime: 5 * 60_000,
  });
  const suggestions = (data?.results ?? []).filter(
    (s) => !value.some((v) => v.toLowerCase() === s.name.toLowerCase()),
  );
  const full = value.length >= max;

  const add = (raw: string) => {
    const t = raw.trim().replace(/\s+/g, " ");
    if (!t || full) return;
    // A duplicate is simply dropped (input cleared), so the next skill doesn't append to it.
    if (!value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t]);
    setText("");
    setActive(0);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(suggestions[active]?.name ?? text);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}{" "}
        <span className="font-normal text-mist">
          ({value.length}/{max})
        </span>
      </label>
      <div className="mt-1.5 flex flex-wrap gap-2 rounded-xl border border-line bg-black/40 p-2 focus-within:border-flare/70 focus-within:ring-2 focus-within:ring-flare/30">
        {value.map((v) => (
          <span key={v} className="glass-pill flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-sm">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="grid h-6 w-6 place-items-center rounded-full text-mist hover:bg-white/10 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          role="combobox"
          aria-expanded={suggestions.length > 0 && Boolean(search)}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          disabled={full}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={full ? "Maximum reached" : value.length ? "Add another" : "e.g. React, Django, Docker"}
          className="min-w-[10rem] flex-1 bg-transparent px-2 py-1 text-ink outline-none placeholder:text-mist/70"
        />
      </div>
      {search && suggestions.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="glass-panel glass-scrim mt-1 max-h-60 overflow-auto rounded-xl p-1"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.slug}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                add(s.name);
              }}
              className={cn(
                "flex cursor-pointer justify-between rounded-lg px-3 py-2 text-sm",
                i === active && "bg-white/10",
              )}
            >
              {s.name}
              <span className="text-mist">{s.category}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-sm text-mist">
        Press Enter to add. We check each claim against your public code.
      </p>
    </div>
  );
}
