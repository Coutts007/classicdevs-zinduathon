import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { GlassPanel } from "@/components/glass/Glass";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/States";
import { userMessage } from "@/lib/api/errors";

import { PAGE_SIZE } from "./url-state";

type Page<T> = { count: number; results: T[] };

/** Loading / error / empty / data for a paginated admin list, inside one glass panel. */
export function ListPanel<T>({
  query,
  empty,
  page,
  onPage,
  toolbar,
  children,
}: {
  query: UseQueryResult<Page<T>>;
  empty: { title: string; description: string };
  page: number;
  onPage: (p: number) => void;
  toolbar?: ReactNode;
  children: (rows: T[]) => ReactNode;
}) {
  return (
    <GlassPanel className="space-y-4 p-4 sm:p-5">
      {toolbar && <div className="flex flex-wrap items-end gap-3">{toolbar}</div>}
      {query.isPending ? (
        <SkeletonBlock lines={6} label="Loading" />
      ) : query.isError ? (
        <ErrorState description={userMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.count === 0 ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : (
        <>
          <p className="text-sm text-mist" aria-live="polite">
            {query.data.count} result{query.data.count === 1 ? "" : "s"}
          </p>
          <div className={query.isPlaceholderData ? "opacity-60 transition" : "transition"}>
            {children(query.data.results)}
          </div>
          <Pagination page={page} count={query.data.count} pageSize={PAGE_SIZE} onPage={onPage} />
        </>
      )}
    </GlassPanel>
  );
}

/** Pretty-printed JSON in a scrollable code block. */
export function JsonView({ value, label }: { value: unknown; label: string }) {
  return (
    // Focusable so keyboard users can scroll long JSON (axe: scrollable-region-focusable).
    <pre
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="max-h-72 overflow-auto rounded-xl border border-line bg-black/40 p-3 font-mono text-xs leading-relaxed text-mist"
    >
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}
