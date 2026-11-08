import { format, formatDistanceToNowStrict } from "date-fns";

export const fmtDate = (iso: string | null | undefined) => (iso ? format(new Date(iso), "d MMM yyyy") : "–");
export const fmtMonth = (iso: string | null | undefined) => (iso ? format(new Date(iso), "MMM yyyy") : "–");
export const ago = (iso: string | null | undefined) =>
  iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : "–";

export const SUB_SCORE_LABELS = {
  consistency: "Consistency",
  iteration: "Iteration",
  quality: "Quality",
  breadth: "Breadth",
  ownership: "Ownership",
} as const;
