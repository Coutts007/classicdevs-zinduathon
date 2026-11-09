/**
 * Configuration, read once here (not inline in JSX). Runtime values from /config.js (written by the
 * Docker image at start-up) win over the build-time VITE_* values (frontend .env.example).
 */
type Runtime = Partial<Record<"apiBaseUrl" | "appUrl" | "djangoAdminUrl" | "apiDocsUrl", string>>;
const runtime: Runtime =
  (typeof window !== "undefined" && (window as Window & { __SKILLPROOF__?: Runtime }).__SKILLPROOF__) || {};

export const env = {
  apiBaseUrl: (
    runtime.apiBaseUrl ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000/api/v1"
  ).replace(/\/$/, ""),
  appUrl: runtime.appUrl || import.meta.env.VITE_APP_URL || "http://localhost:5173",
  djangoAdminUrl:
    runtime.djangoAdminUrl || import.meta.env.VITE_DJANGO_ADMIN_URL || "http://localhost:8000/django-admin/",
  apiDocsUrl: runtime.apiDocsUrl || import.meta.env.VITE_API_DOCS_URL || "http://localhost:8000/api/v1/docs/",
  isDev: import.meta.env.DEV,
  includeDevRoutes: import.meta.env.DEV || import.meta.env.MODE === "test",
};
