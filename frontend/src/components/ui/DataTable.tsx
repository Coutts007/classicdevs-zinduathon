import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable (within the current page; the API pages the data). */
  sortValue?: (row: T) => string | number | null | undefined;
  className?: string;
};

/**
 * Accessible table: real <table> semantics, sortable headers are buttons with aria-sort, and an
 * optional row action (`onRowOpen`) is a button in the first cell so it's reachable by keyboard.
 * Scrolls horizontally inside its own box on small screens.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  rowClassName?: (row: T) => string | undefined;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sortValue || !sort) return rows;
    const value = col.sortValue;
    return [...rows].sort((a, b) => {
      const x = value(a) ?? "";
      const y = value(b) ?? "";
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, columns, sort]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-mist">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                  className={cn("px-3 py-2.5 font-medium", c.className)}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSort(
                          active && sort.dir === 1
                            ? { key: c.key, dir: -1 }
                            : active
                              ? null
                              : { key: c.key, dir: 1 },
                        )
                      }
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {c.header}
                      {active ? (
                        sort.dir === 1 ? (
                          <ArrowUp aria-hidden className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown aria-hidden className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown aria-hidden className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {sorted.map((row) => (
            <tr key={rowKey(row)} className={cn("hover:bg-white/[0.03]", rowClassName?.(row))}>
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2.5 align-middle", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
