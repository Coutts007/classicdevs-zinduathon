/** Every route per role, for the accessibility and responsive passes. */
export const PUBLIC = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/terms",
  "/privacy",
  "/u/amina-demo",
  "/u/nobody-here-123",
  "/nope",
];

export const SEEKER = [
  "/app",
  "/app/analyse",
  "/app/card",
  "/app/history",
  "/app/inbox",
  "/app/jobs",
  "/app/notifications",
  "/app/settings",
  "/app/settings?tab=contact",
  "/app/settings?tab=github",
  "/app/settings?tab=google",
  "/app/settings?tab=notifications",
  "/app/settings?tab=privacy",
  "/app/settings?tab=password",
];

export const RECRUITER = [
  "/recruiter",
  "/recruiter/candidates",
  "/recruiter/candidates/amina-demo",
  "/recruiter/jobs",
  "/recruiter/jobs/new",
  "/recruiter/shortlists",
  "/recruiter/feedback",
  "/recruiter/settings",
];

export const ADMIN = [
  "/admin",
  "/admin/recruiters",
  "/admin/users",
  "/admin/analyses",
  "/admin/skills",
  "/admin/skills?tab=mappings",
  "/admin/deliveries",
  "/admin/moderation",
  "/admin/audit-log",
];
