import * as Slider from "@radix-ui/react-slider";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { ChipInput } from "@/components/ui/ChipInput";
import { Field, Input, Select } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { Toggle } from "@/components/ui/Toggle";
import { userMessage } from "@/lib/api/errors";

import { useCandidates, type CandidateQuery } from "./api";
import { CandidateRow } from "./parts";

type Label = NonNullable<CandidateQuery["minLabel"]>;

/** Filters live in the URL, so a search can be bookmarked, shared and survives Back. */
function useFilters() {
  const [params, setParams] = useSearchParams();
  const query: CandidateQuery = {
    skills: params.get("skills") || undefined,
    minLabel: (params.get("minLabel") as Label) || undefined,
    minScore: params.get("minScore") ? Number(params.get("minScore")) : undefined,
    openToWork: params.get("openToWork") === "true" ? true : undefined,
    search: params.get("q") || undefined,
    ordering: params.get("sort") === "recent" ? "-analysedAt" : "-signalScore",
    page: Number(params.get("page") ?? 1),
  };
  const set = (next: Record<string, string | null>, resetPage = true) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v === null || v === "" ? merged.delete(k) : merged.set(k, v)));
    if (resetPage) merged.delete("page");
    setParams(merged, { replace: true });
  };
  const active = ["skills", "minLabel", "minScore", "openToWork", "q"].some((k) => params.has(k));
  return { query, set, active, clear: () => setParams({}, { replace: true }) };
}

function ScoreSlider({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const id = useId();
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span id={id} className="font-medium">
          Minimum Signal Score
        </span>
        <span className="tabular text-flare-hot">{local}</span>
      </div>
      <Slider.Root
        aria-labelledby={id}
        min={0}
        max={100}
        step={5}
        value={[local]}
        onValueChange={([v]) => setLocal(v ?? 0)}
        onValueCommit={([v]) => onCommit(v ?? 0)}
        className="relative mt-3 flex h-5 touch-none select-none items-center"
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-white/10">
          <Slider.Range className="absolute h-full rounded-full bg-flare" />
        </Slider.Track>
        <Slider.Thumb
          aria-labelledby={id}
          className="block h-5 w-5 rounded-full border-2 border-flare bg-white shadow-[0_0_12px_rgb(var(--flare)/0.6)] outline-none focus-visible:ring-4 focus-visible:ring-flare/40"
        />
      </Slider.Root>
    </div>
  );
}

function Filters({ f }: { f: ReturnType<typeof useFilters> }) {
  const { query, set } = f;
  const [text, setText] = useState(query.search ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((query.search ?? "") !== text.trim()) set({ q: text.trim() });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on typing only
  }, [text]);
  const skills = query.skills ? query.skills.split(",") : [];
  return (
    <GlassPanel glow as="aside" aria-label="Filters" className="space-y-5 p-5 lg:sticky lg:top-24">
      <h2 className="flex items-center gap-2 text-base">
        <SlidersHorizontal aria-hidden className="h-4 w-4 text-flare-hot" /> Filters
      </h2>
      <Field label="Search">
        {({ id }) => (
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-mist" />
            <Input
              id={id}
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Name, login or headline"
              className="pl-10"
            />
          </div>
        )}
      </Field>
      <ChipInput label="Skills" max={6} value={skills} onChange={(v) => set({ skills: v.join(",") })} />
      <div>
        <p className="mb-2 text-sm font-medium" id="min-label">
          At least
        </p>
        <Segmented
          label="Minimum skill label"
          value={query.minLabel ?? "emerging"}
          options={[
            { value: "emerging", label: "Emerging" },
            { value: "moderate", label: "Moderate" },
            { value: "strong", label: "Strong" },
          ]}
          onChange={(v) => set({ minLabel: v === "emerging" ? null : v })}
        />
        <p className="mt-1.5 text-xs text-mist">Applies to the skills above.</p>
      </div>
      <ScoreSlider value={query.minScore ?? 0} onCommit={(v) => set({ minScore: v ? String(v) : null })} />
      <Toggle
        label="Open to work"
        description="Only people looking right now."
        checked={Boolean(query.openToWork)}
        onChange={(v) => set({ openToWork: v ? "true" : null })}
      />
      {f.active && (
        <Button variant="ghost" size="sm" onClick={f.clear} className="w-full">
          Clear filters
        </Button>
      )}
    </GlassPanel>
  );
}

export function CandidatesPage() {
  const f = useFilters();
  const list = useCandidates(f.query);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Filters f={f} />
      <section aria-label="Candidates" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mist" aria-live="polite">
            {list.data ? `${list.data.count} candidate${list.data.count === 1 ? "" : "s"}` : "Searching…"}
          </p>
          <div className="flex items-center gap-2 text-sm text-mist">
            <label htmlFor="candidate-sort">Sort by</label>
            <Select
              id="candidate-sort"
              value={f.query.ordering === "-analysedAt" ? "recent" : "score"}
              onChange={(e) => f.set({ sort: e.target.value === "recent" ? "recent" : null })}
              className="h-9 w-auto py-0 text-sm"
            >
              <option value="score">Highest score</option>
              <option value="recent">Recently analysed</option>
            </Select>
          </div>
        </div>
        {list.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-card" />)
        ) : list.isError ? (
          <GlassPanel>
            <ErrorState description={userMessage(list.error)} onRetry={() => list.refetch()} />
          </GlassPanel>
        ) : list.data.count === 0 ? (
          <GlassPanel>
            <EmptyState
              title="No one matches all of that"
              description="Try fewer skills, a lower minimum label or score, or turn off “Open to work”."
              action={
                f.active ? (
                  <Button variant="glass" onClick={f.clear}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </GlassPanel>
        ) : (
          <>
            <ul
              className={list.isPlaceholderData ? "space-y-3 opacity-60 transition" : "space-y-3 transition"}
            >
              {list.data.results.map((c) => (
                <li key={c.githubLogin}>
                  <CandidateRow candidate={c} />
                </li>
              ))}
            </ul>
            <Pagination
              page={f.query.page ?? 1}
              count={list.data.count}
              pageSize={20}
              onPage={(p) => f.set({ page: String(p) }, false)}
            />
          </>
        )}
      </section>
    </div>
  );
}
