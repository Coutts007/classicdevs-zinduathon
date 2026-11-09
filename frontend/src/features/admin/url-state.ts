import { useSearchParams } from "react-router-dom";

export const PAGE_SIZE = 20;

/** Filters and page number in the URL (shareable, survive Back). Changing a filter resets the page. */
export function useUrlState() {
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";
  const page = Number(params.get("page") ?? 1);
  const set = (next: Record<string, string | null>, keepPage = false) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? merged.set(k, v) : merged.delete(k)));
    if (!keepPage) merged.delete("page");
    setParams(merged, { replace: true });
  };
  return { get, page, set, setPage: (p: number) => set({ page: String(p) }, true) };
}
