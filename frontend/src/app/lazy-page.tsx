import { lazy, Suspense, type ComponentType } from "react";

import { SkeletonBlock } from "@/components/ui/States";

/**
 * A page loaded with React.lazy inside the route element, for routes behind a guard.
 *
 * Why not the route's own `lazy`: React Router resolves `lazy` for every matched route before it
 * renders any of them, so a signed-out visit to /app would download and run the whole dashboard
 * bundle (recharts and all) before RequireAuth could redirect to /login. Here the guard and shell
 * render at once and only the page waits for its chunk.
 */
export function lazyPage<M>(load: () => Promise<M>, pick: (m: M) => ComponentType) {
  const Page = lazy(async () => ({ default: pick(await load()) }));
  return {
    element: (
      <Suspense fallback={<SkeletonBlock lines={4} label="Loading page" />}>
        <Page />
      </Suspense>
    ),
  };
}
