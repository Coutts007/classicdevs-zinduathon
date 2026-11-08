import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ProgressGlowProvider } from "@/components/space/SpaceBackdrop";
import type { Me } from "@/lib/api/types";
import { AuthContext, type AuthState } from "@/lib/auth/auth-context";

/** Render with Query, auth (a given user), the progress glow and a router at `path`. */
export function renderApp(
  ui: ReactNode,
  { user = null, path = "/", route = "*" }: { user?: Me | null; path?: string; route?: string } = {},
) {
  const auth: AuthState = {
    status: user ? "signed-in" : "signed-out",
    user,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshMe: vi.fn(),
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <ProgressGlowProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={route} element={ui} />
            </Routes>
          </MemoryRouter>
        </ProgressGlowProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}
