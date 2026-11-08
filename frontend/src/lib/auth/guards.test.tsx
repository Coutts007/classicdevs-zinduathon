import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { Me } from "@/lib/api/types";
import { makeMe, recruiterMe } from "@/test/fixtures";

import { AuthContext, type AuthState } from "./auth-context";
import { GuestOnly, RequireAuth } from "./guards";
import { homeFor, safeNext } from "./redirects";

function renderAt(
  path: string,
  user: Me | null,
  status: AuthState["status"] = user ? "signed-in" : "signed-out",
) {
  const auth: AuthState = { status, user, signIn: vi.fn(), signOut: vi.fn(), refreshMe: vi.fn() };
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route element={<GuestOnly />}>
            <Route path="/register" element={<p>register page</p>} />
          </Route>
          <Route
            path="/app"
            element={
              <RequireAuth roles={["job_seeker"]}>
                <p>seeker area</p>
              </RequireAuth>
            }
          />
          <Route
            path="/recruiter"
            element={
              <RequireAuth roles={["recruiter"]}>
                <p>recruiter area</p>
              </RequireAuth>
            }
          />
          <Route
            path="/recruiter/pending"
            element={
              <RequireAuth roles={["recruiter"]} allowUnapproved>
                <p>pending page</p>
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth roles={["admin"]}>
                <p>admin area</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("route guards", () => {
  it("sends signed-out users to login", () => {
    renderAt("/app", null);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("shows a splash while the session is being restored", () => {
    renderAt("/app", null, "loading");
    expect(screen.getByRole("status", { name: "Loading SkillProof" })).toBeInTheDocument();
  });

  it.each([
    ["/app", makeMe(), "seeker area"],
    ["/recruiter", recruiterMe("approved"), "recruiter area"],
    ["/admin", makeMe({ role: "admin", jobSeekerProfile: null }), "admin area"],
  ])("lets %s through for its own role", (path, user, text) => {
    renderAt(path, user);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("redirects the wrong role to its own home", () => {
    renderAt("/admin", makeMe());
    expect(screen.getByText("seeker area")).toBeInTheDocument();
    renderAt("/app", recruiterMe("approved"));
    expect(screen.getByText("recruiter area")).toBeInTheDocument();
  });

  it.each(["pending", "rejected", "suspended"] as const)(
    "keeps %s recruiters on the pending screen",
    (status) => {
      renderAt("/recruiter", recruiterMe(status));
      expect(screen.getByText("pending page")).toBeInTheDocument();
    },
  );

  it("guest-only pages send signed-in users home", () => {
    renderAt("/register", makeMe());
    expect(screen.getByText("seeker area")).toBeInTheDocument();
  });
});

describe("redirects", () => {
  it("routes each role home", () => {
    expect(homeFor(makeMe())).toBe("/app");
    expect(homeFor(recruiterMe("approved"))).toBe("/recruiter");
    expect(homeFor(recruiterMe("pending"))).toBe("/recruiter/pending");
    expect(homeFor(makeMe({ role: "admin" }))).toBe("/admin");
  });

  it("only accepts same-site next paths", () => {
    expect(safeNext("/app/inbox")).toBe("/app/inbox");
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext("/login?next=/x")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});
