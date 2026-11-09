import { http, HttpResponse } from "msw";

import { API, server } from "@/test/server";

import { startOAuth, takeOAuthSession } from "./oauth";

const assign = vi.fn();
beforeEach(() => {
  sessionStorage.clear();
  assign.mockReset();
  vi.stubGlobal("location", { ...window.location, assign });
});
afterEach(() => vi.unstubAllGlobals());

describe("startOAuth", () => {
  it("sends the browser to Google with the signed state kept per provider", async () => {
    let query = "";
    server.use(
      http.get(`${API}/auth/google/authorize`, ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({
          authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth?x=1",
          state: "g-state",
        });
      }),
    );

    await startOAuth("google", { role: "job_seeker", acceptTerms: true, next: "/app/jobs" });

    expect(assign).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth?x=1");
    expect(query).toContain("acceptTerms=true");
    expect(query).not.toContain("next"); // `next` stays in the browser
    expect(takeOAuthSession("github")).toEqual({ state: null, next: null }); // not GitHub's slot
    expect(takeOAuthSession("google")).toEqual({ state: "g-state", next: "/app/jobs" });
    expect(takeOAuthSession("google")).toEqual({ state: null, next: null }); // taken once
  });

  it("uses the GitHub endpoint for GitHub", async () => {
    server.use(
      http.get(`${API}/auth/github/authorize`, () =>
        HttpResponse.json({
          authorizeUrl: "https://github.com/login/oauth/authorize?x=1",
          state: "gh-state",
        }),
      ),
    );
    await startOAuth("github");
    expect(assign).toHaveBeenCalledWith("https://github.com/login/oauth/authorize?x=1");
    expect(takeOAuthSession("github").state).toBe("gh-state");
  });

  it("surfaces the API's error and does not navigate", async () => {
    server.use(
      http.get(`${API}/auth/google/authorize`, () =>
        HttpResponse.json({ code: "google_not_configured", message: "not configured" }, { status: 503 }),
      ),
    );
    await expect(startOAuth("google")).rejects.toMatchObject({ code: "google_not_configured" });
    expect(assign).not.toHaveBeenCalled();
  });
});
