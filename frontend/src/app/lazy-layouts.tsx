import { lazy, Suspense } from "react";

import { Splash } from "@/components/Splash";

// Layouts for signed-in areas and auth screens are their own chunks: a visitor to the landing page
// or a public card downloads neither (the app shell pulls in menus, dialogs and the bell).
const LazyAppShell = lazy(() => import("./layouts/AppShell").then((m) => ({ default: m.AppShell })));
const LazyAuthLayout = lazy(() => import("./layouts/AuthLayout").then((m) => ({ default: m.AuthLayout })));
export const AppShell = ({ area }: { area: "job_seeker" | "recruiter" | "admin" }) => (
  <Suspense fallback={<Splash />}>
    <LazyAppShell area={area} />
  </Suspense>
);
export const AuthLayout = () => (
  <Suspense fallback={<Splash />}>
    <LazyAuthLayout />
  </Suspense>
);
