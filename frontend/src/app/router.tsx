import { createBrowserRouter, type RouteObject } from "react-router-dom";

import { GuestOnly, RequireAuth } from "@/lib/auth/guards";
import { env } from "@/lib/env";

import { AppShell } from "./layouts/AppShell";
import { AuthLayout } from "./layouts/AuthLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { NotFound, RouteError } from "./pages/SystemPages";

const auth = () => import("@/features/auth");

/** Each section is its own chunk (React Router `lazy`), so the landing page stays small. */
const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import("@/features/landing/LandingPage")).LandingPage }),
      },
      {
        path: "u/:login",
        lazy: async () => ({ Component: (await import("@/features/card/PublicCardPage")).PublicCardPage }),
      },
      {
        path: "terms",
        lazy: async () => ({ Component: (await import("@/features/legal/LegalPages")).TermsPage }),
      },
      {
        path: "privacy",
        lazy: async () => ({ Component: (await import("@/features/legal/LegalPages")).PrivacyPage }),
      },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: "login", lazy: async () => ({ Component: (await auth()).LoginPage }) },
          { path: "register", lazy: async () => ({ Component: (await auth()).RegisterPage }) },
          { path: "forgot-password", lazy: async () => ({ Component: (await auth()).ForgotPasswordPage }) },
        ],
      },
      { path: "reset-password", lazy: async () => ({ Component: (await auth()).ResetPasswordPage }) },
      { path: "verify-email", lazy: async () => ({ Component: (await auth()).VerifyEmailPage }) },
      { path: "auth/github/callback", lazy: async () => ({ Component: (await auth()).GithubCallbackPage }) },
      {
        path: "recruiter/pending",
        element: <RequireAuth roles={["recruiter"]} allowUnapproved />,
        children: [{ index: true, lazy: async () => ({ Component: (await auth()).RecruiterPendingPage }) }],
      },
    ],
  },
  {
    path: "app",
    element: (
      <RequireAuth roles={["job_seeker"]}>
        <AppShell area="job_seeker" />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        handle: { title: "Dashboard" },
        lazy: async () => ({ Component: (await import("@/features/seeker/DashboardPage")).DashboardPage }),
      },
      {
        path: "analyse",
        handle: { title: "Analyse" },
        lazy: async () => ({ Component: (await import("@/features/analysis/AnalysePage")).AnalysePage }),
      },
      {
        path: "card",
        handle: { title: "My card" },
        lazy: async () => ({ Component: (await import("@/features/seeker/MyCardPage")).MyCardPage }),
      },
      {
        path: "history",
        handle: { title: "History" },
        lazy: async () => ({ Component: (await import("@/features/seeker/HistoryPage")).HistoryPage }),
      },
      {
        path: "inbox",
        handle: { title: "Inbox" },
        lazy: async () => ({ Component: (await import("@/features/seeker/InboxPage")).InboxPage }),
      },
      {
        path: "notifications",
        handle: { title: "Notifications" },
        lazy: async () => ({
          Component: (await import("@/features/notifications/NotificationsPage")).NotificationsPage,
        }),
      },
      {
        path: "settings",
        handle: { title: "Settings" },
        lazy: async () => ({ Component: (await import("@/features/settings/SettingsPage")).SettingsPage }),
      },
    ],
  },
  {
    path: "recruiter",
    element: (
      <RequireAuth roles={["recruiter"]}>
        <AppShell area="recruiter" />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import("./pages/Placeholder")).AppPlaceholder }),
      },
      {
        path: "notifications",
        handle: { title: "Notifications" },
        lazy: async () => ({
          Component: (await import("@/features/notifications/NotificationsPage")).NotificationsPage,
        }),
      },
      {
        path: "settings",
        handle: { title: "Settings" },
        lazy: async () => ({ Component: (await import("@/features/settings/SettingsPage")).SettingsPage }),
      },
    ],
  },
  {
    path: "admin",
    element: (
      <RequireAuth roles={["admin"]}>
        <AppShell area="admin" />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import("./pages/Placeholder")).AppPlaceholder }),
      },
      {
        path: "notifications",
        handle: { title: "Notifications" },
        lazy: async () => ({
          Component: (await import("@/features/notifications/NotificationsPage")).NotificationsPage,
        }),
      },
    ],
  },
  ...(env.includeDevRoutes
    ? [
        { path: "dev/ui", lazy: async () => ({ Component: (await import("@/dev/DevUiPage")).DevUiPage }) },
        {
          path: "dev/planet-capture",
          lazy: async () => ({ Component: (await import("@/dev/PlanetCapturePage")).PlanetCapturePage }),
        },
      ]
    : []),
  { path: "*", element: <NotFound /> },
];

export const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
