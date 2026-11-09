import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

const assign = vi.fn();
beforeEach(() => {
  sessionStorage.clear();
  assign.mockReset();
  vi.stubGlobal("location", { ...window.location, assign });
});
afterEach(() => vi.unstubAllGlobals());

describe("Continue with Google", () => {
  it("is offered next to GitHub on the sign-in page and starts the Google flow", async () => {
    server.use(
      http.get(`${API}/auth/google/authorize`, () =>
        HttpResponse.json({ authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth?x=1", state: "s" }),
      ),
    );
    renderApp(<LoginPage />, { path: "/login" });

    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth?x=1"),
    );
  });

  it("shows the API's message when Google isn't configured", async () => {
    server.use(
      http.get(`${API}/auth/google/authorize`, () =>
        HttpResponse.json(
          { code: "google_not_configured", message: "Google sign-in is not configured on this server." },
          { status: 503 },
        ),
      ),
    );
    renderApp(<LoginPage />, { path: "/login" });
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Google sign-in is not configured/);
    expect(assign).not.toHaveBeenCalled();
  });

  it("sign-up for a job seeker asks for the terms with the click and sends consent", async () => {
    let query = "";
    server.use(
      http.get(`${API}/auth/google/authorize`, ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({ authorizeUrl: "https://accounts.google.com/x", state: "s" });
      }),
    );
    renderApp(<RegisterPage />, { path: "/register?role=job_seeker" });

    expect(screen.getByText(/By continuing with GitHub or Google you accept the/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign up with Google" }));

    await vi.waitFor(() => expect(assign).toHaveBeenCalled());
    expect(query).toContain("acceptTerms=true");
    expect(query).toContain("role=job_seeker");
  });

  it("is not offered to recruiters, who register with email first", () => {
    renderApp(<RegisterPage />, { path: "/register?role=recruiter" });
    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
  });
});
