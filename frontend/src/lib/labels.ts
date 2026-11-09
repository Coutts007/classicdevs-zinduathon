/** UI copy for API enum values (values stay snake_case, as the API sends them). */
import type { FeedbackStatus, JobStatus, ShortlistStage } from "@/lib/api/types";

type Tone = "neutral" | "ok" | "warn" | "bad" | "flare";

export const FEEDBACK_STATUS: Record<FeedbackStatus, { label: string; tone: Tone }> = {
  shortlisted: { label: "Shortlisted", tone: "ok" },
  interview: { label: "Interview", tone: "flare" },
  not_a_fit: { label: "Not a fit", tone: "bad" },
  general: { label: "General", tone: "neutral" },
};

export const STAGES: Record<ShortlistStage, { label: string; tone: Tone }> = {
  saved: { label: "Saved", tone: "neutral" },
  contacted: { label: "Contacted", tone: "warn" },
  interview: { label: "Interview", tone: "flare" },
  offer: { label: "Offer", tone: "ok" },
  rejected: { label: "Rejected", tone: "bad" },
};
export const STAGE_ORDER = Object.keys(STAGES) as ShortlistStage[];

export const JOB_STATUS: Record<JobStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Open", tone: "ok" },
  closed: { label: "Closed", tone: "bad" },
};

export const EMPLOYMENT = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
} as const;

export const REMOTE = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" } as const;

export const MIN_LABELS = { emerging: "Emerging", moderate: "Moderate", strong: "Strong" } as const;
