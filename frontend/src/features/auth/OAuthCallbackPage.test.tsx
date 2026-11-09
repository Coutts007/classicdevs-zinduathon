import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AuthContext, type AuthState } from "@/lib/auth/auth-context";
import { makeMe } from "@/test/fixtures";
import { API, server } from "@/test/server";

import { GithubCallbackPage } from "./GithubCallbackPage";
import { GoogleCallbackPage } from "./GoogleCallbackPage";

function renderCallback(path: string) {
  const signIn = vi.fn();
  const auth: AuthState = { status: "signed-out", user: null, signIn, signOut: vi.fn(), refreshMe: vi.fn() };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/auth/github/callback" element={<GithubCallbackPage />} />
          <Route path="/app" element={<p>dashboard</p>} />
          <Route path="/app/jobs" element={<p>jobs page</p>} />
          <Route path="/login" element={<p>login</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { signIn };
}

const session = { access: "a", refresh: "r", user: makeMe(), created: false };

beforeEach(() => sessionStorage.clear());

describe("Google callback", () => {
  it("exchanges the code, signs in and goes to the dashboard", async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/auth/google/callback`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(session);
      }),
    );
    sessionStorage.setItem("skillproof.googleState", "s1");
    const { signIn } = renderCallback("/auth/google/callback?code=abc&state=s1");

    expect(await screen.findByText("dashboard")).toBeInTheDocument();
    expect(body).toEqual({ code: "abc", state: "s1" });
    expect(signIn).toHaveBeenCalledWith(session);
    expect(sessionStorage.getItem("skillproof.googleState")).toBeNull(); // single use
  });

  it("returns to the page the sign-in started from", async () => {
    server.use(http.post(`${API}/auth/google/callback`, () => HttpResponse.json(session)));
    sessionStorage.setItem("skillproof.googleState", "s1");
    sessionStorage.setItem("skillproof.googleNext", "/app/jobs");
    renderCallback("/auth/google/callback?code=abc&state=s1");
    expect(await screen.findByText("jobs page")).toBeInTheDocument();
  });

  it("refuses a state that doesn't match this browser's, without calling the API", async () => {
    const called = vi.fn();
    server.use(http.post(`${API}/auth/google/callback`, () => (called(), HttpResponse.json(session))));
    sessionStorage.setItem("skillproof.googleState", "mine");
    renderCallback("/auth/google/callback?code=abc&state=someone-elses");

    expect(await screen.findByRole("alert")).toHaveTextContent(/expired or didn't start in this browser/);
    expect(called).not.toHaveBeenCalled();
  });

  it("does not accept a GitHub state", async () => {
    sessionStorage.setItem("skillproof.githubState", "gh");
    renderCallback("/auth/google/callback?code=abc&state=gh");
    // Google's own storage is empty, so the API (which also checks the signature) decides.
    server.use(
      http.post(`${API}/auth/google/callback`, () =>
        HttpResponse.json({ code: "state_invalid", message: "x" }, { status: 400 }),
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/expired or didn't start/);
  });

  it("explains an unverified Google email", async () => {
    server.use(
      http.post(`${API}/auth/google/callback`, () =>
        HttpResponse.json({ code: "google_email_unverified", message: "x" }, { status: 400 }),
      ),
    );
    renderCallback("/auth/google/callback?code=abc&state=s1");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Google says your email address isn't verified/,
    );
    expect(screen.getByRole("heading", { name: "Google sign-in didn't finish" })).toBeInTheDocument();
  });

  it("explains an account linked elsewhere", async () => {
    server.use(
      http.post(`${API}/auth/google/callback`, () =>
        HttpResponse.json({ code: "google_already_linked", message: "x" }, { status: 409 }),
      ),
    );
    renderCallback("/auth/google/callback?code=abc&state=s1");
    expect(await screen.findByRole("alert")).toHaveTextContent(/linked to a different SkillProof account/);
  });

  it("handles the user cancelling on Google", async () => {
    renderCallback("/auth/google/callback?error=access_denied");
    expect(await screen.findByRole("alert")).toHaveTextContent("Google sign-in was cancelled.");
  });

  it("needs a code", async () => {
    renderCallback("/auth/google/callback");
    expect(await screen.findByRole("alert")).toHaveTextContent(/needs a code from Google/);
  });
});

describe("GitHub callback (shared page)", () => {
  it("still posts to the GitHub endpoint and uses GitHub's wording", async () => {
    server.use(
      http.post(`${API}/auth/github/callback`, () =>
        HttpResponse.json({ code: "github_email_unverified", message: "x" }, { status: 400 }),
      ),
    );
    renderCallback("/auth/github/callback?code=abc&state=s1");
    expect(await screen.findByRole("alert")).toHaveTextContent(/no verified primary email/);
    expect(screen.getByRole("heading", { name: "GitHub sign-in didn't finish" })).toBeInTheDocument();
  });
});
