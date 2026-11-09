import type { Me } from "@/lib/api/types";

/** Where each role lands after sign-in (FRONTEND_PROMPT §5). */
export function homeFor(user: Me): string {
  if (user.role === "admin") return "/admin";
  if (user.role === "recruiter") {
    return user.recruiterProfile?.approvalStatus === "approved" ? "/recruiter" : "/recruiter/pending";
  }
  return "/app";
}

/** Only same-site relative paths are honoured for ?next= (no open redirects). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) return null;
  return next;
}

/**
 * Notification links from the API are role-neutral (`/inbox`, `/dashboard`, `/recruiter`, `/u/…`)
 * and also appear in emails and SMS. Map them to the signed-in user's area.
 */
export function resolveLink(path: string, user: Me): string {
  if (path === "/dashboard") return homeFor(user);
  if (path === "/inbox") return user.role === "job_seeker" ? "/app/inbox" : homeFor(user);
  return path;
}
