import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "./Button";

export function Pagination({
  page,
  count,
  pageSize,
  onPage,
}: {
  page: number;
  count: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm text-mist">
      <span className="tabular">
        Page {page} of {pages} · {count} total
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="glass" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft aria-hidden className="h-4 w-4" /> Previous
        </Button>
        <Button size="sm" variant="glass" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight aria-hidden className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
