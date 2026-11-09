import { createBrowserRouter, type RouteObject } from "react-router-dom";

import { GuestOnly, RequireAuth, RoleLink } from "@/lib/auth/guards";
import { env } from "@/lib/env";

import { AppShell, AuthLayout } from "./lazy-layouts";
import { lazyPage } from "./lazy-page";
import { PublicLayout } from "./layouts/PublicLayout";
import { NotFound, RouteError } from "./pages/SystemPages";

const auth = () => import("@/features/auth");

/**
 * Each section is its own chunk, so the landing page stays small. Public routes use React Router
 * `lazy`; guarded routes use `lazyPage` so the guard can redirect before any page code loads.
 */
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
        children: [
          {
            index: true,
            ...lazyPage(
              () => auth(),
              (m) => m.RecruiterPendingPage,
            ),
          },
        ],
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
        ...lazyPage(
          () => import("@/features/seeker/DashboardPage"),
          (m) => m.DashboardPage,
        ),
      },
      {
        path: "analyse",
        handle: { title: "Analyse" },
        ...lazyPage(
          () => import("@/features/analysis/AnalysePage"),
          (m) => m.AnalysePage,
        ),
      },
      {
        path: "card",
        handle: { title: "My card" },
        ...lazyPage(
          () => import("@/features/seeker/MyCardPage"),
          (m) => m.MyCardPage,
        ),
      },
      {
        path: "history",
        handle: { title: "History" },
        ...lazyPage(
          () => import("@/features/seeker/HistoryPage"),
          (m) => m.HistoryPage,
        ),
      },
      {
        path: "jobs",
        handle: { title: "Jobs" },
        ...lazyPage(
          () => import("@/features/seeker/JobsPage"),
          (m) => m.SeekerJobsPage,
        ),
      },
      {
        path: "inbox",
        handle: { title: "Inbox" },
        ...lazyPage(
          () => import("@/features/seeker/InboxPage"),
          (m) => m.InboxPage,
        ),
      },
      {
        path: "notifications",
        handle: { title: "Notifications" },
        ...lazyPage(
          () => import("@/features/notifications/NotificationsPage"),
          (m) => m.NotificationsPage,
        ),
      },
      {
        path: "settings",
        handle: { title: "Settings" },
        ...lazyPage(
          () => import("@/features/settings/SettingsPage"),
          (m) => m.SettingsPage,
        ),
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
        handle: { title: "Dashboard" },
        ...lazyPage(
          () => import("@/features/recruiter/DashboardPage"),
          (m) => m.RecruiterDashboardPage,
        ),
      },
      {
        path: "candidates",
        handle: { title: "Candidates" },
        ...lazyPage(
          () => import("@/features/recruiter/CandidatesPage"),
          (m) => m.CandidatesPage,
        ),
      },
      {
        path: "candidates/:login",
        handle: { title: "Candidate" },
        ...lazyPage(
          () => import("@/features/recruiter/CandidatePage"),
          (m) => m.CandidatePage,
        ),
      },
      {
        path: "jobs",
        handle: { title: "Jobs" },
        ...lazyPage(
          () => import("@/features/recruiter/JobsPage"),
          (m) => m.JobsPage,
        ),
      },
      {
        path: "jobs/new",
        handle: { title: "New job" },
        ...lazyPage(
          () => import("@/features/recruiter/JobFormPage"),
          (m) => m.JobFormPage,
        ),
      },
      {
        path: "jobs/:id",
        handle: { title: "Job" },
        ...lazyPage(
          () => import("@/features/recruiter/JobPage"),
          (m) => m.JobPage,
        ),
      },
      {
        path: "jobs/:id/edit",
        handle: { title: "Edit job" },
        ...lazyPage(
          () => import("@/features/recruiter/JobFormPage"),
          (m) => m.JobFormPage,
        ),
      },
      {
        path: "shortlists",
        handle: { title: "Shortlists" },
        ...lazyPage(
          () => import("@/features/recruiter/ShortlistBoard"),
          (m) => m.ShortlistBoard,
        ),
      },
      {
        path: "feedback",
        handle: { title: "Feedback sent" },
        ...lazyPage(
          () => import("@/features/recruiter/FeedbackSentPage"),
          (m) => m.FeedbackSentPage,
        ),
      },
      {
        path: "notifications",
        handle: { title: "Notifications" },
        ...lazyPage(
          () => import("@/features/notifications/NotificationsPage"),
          (m) => m.NotificationsPage,
        ),
      },
      {
        path: "settings",
        handle: { title: "Settings" },
        ...lazyPage(
          () => import("@/features/settings/SettingsPage"),
          (m) => m.SettingsPage,
        ),
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
        handle: { title: "Overview" },
        ...lazyPage(
          () => import("@/features/admin/OverviewPage"),
          (m) => m.AdminOverviewPage,
        ),
      },
      {
        path: "recruiters",
        handle: { title: "Recruiters" },
        ...lazyPage(
          () => import("@/features/admin/RecruitersPage"),
          (m) => m.RecruitersPage,
        ),
      },
      {
        path: "users",
        handle: { title: "Users" },
        ...lazyPage(
          () => import("@/features/admin/UsersPage"),
          (m) => m.UsersPage,
        ),
      },
      {
        path: "analyses",
        handle: { title: "Analyses" },
        ...lazyPage(
          () => import("@/features/admin/AnalysesPage"),
          (m) => m.AdminAnalysesPage,
        ),
      },
      {
        path: "skills",
        handle: { title: "Skills" },
        ...lazyPage(
          () => import("@/features/admin/SkillsPage"),
          (m) => m.SkillsPage,
        ),
      },
      {
        path: "deliveries",
        handle: { title: "Deliveries" },
        ...lazyPage(
          () => import("@/features/admin/DeliveriesPage"),
          (m) => m.DeliveriesPage,
        ),
      },
      {
        path: "moderation",
        handle: { title: "Moderation" },
        ...lazyPage(
          () => import("@/features/admin/ModerationPage"),
          (m) => m.ModerationPage,
        ),
      },
      {
        path: "audit-log",
        handle: { title: "Audit log" },
        ...lazyPage(
          () => import("@/features/admin/AuditLogPage"),
          (m) => m.AuditLogPage,
        ),
      },
      {
        path: "notifications",
        handle: { title: "Notifications" },
        ...lazyPage(
          () => import("@/features/notifications/NotificationsPage"),
          (m) => m.NotificationsPage,
        ),
      },
      {
        path: "settings",
        handle: { title: "Settings" },
        ...lazyPage(
          () => import("@/features/settings/SettingsPage"),
          (m) => m.SettingsPage,
        ),
      },
    ],
  },
  // Role-neutral links used in emails, SMS and notifications.
  { path: "inbox", element: <RoleLink path="/inbox" /> },
  { path: "dashboard", element: <RoleLink path="/dashboard" /> },
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
