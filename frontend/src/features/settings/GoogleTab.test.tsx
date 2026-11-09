import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { makeMe } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { SettingsPage } from "./SettingsPage";

const google = { email: "amina@gmail.com", connectedAt: "2026-11-09T10:00:00+03:00" };
const github = {
  login: "amina-demo",
  avatarUrl: "https://avatars.githubusercontent.com/u/1",
  connectedAt: "2026-11-09T10:00:00+03:00",
};

function open(user = makeMe()) {
  return renderApp(<SettingsPage />, { user, path: "/app/settings?tab=google" });
}

describe("Settings → Google", () => {
  it("offers to connect when nothing is linked", () => {
    open();
    expect(screen.getByRole("button", { name: "Connect Google" })).toBeInTheDocument();
  });

  it("is available to recruiters too", () => {
    open(makeMe({ role: "recruiter", jobSeekerProfile: null }));
    expect(screen.getByRole("tab", { name: "Google" })).toBeInTheDocument();
  });

  it("disconnects when a password remains", async () => {
    const called = vi.fn();
    server.use(http.delete(`${API}/auth/google`, () => (called(), new HttpResponse(null, { status: 204 }))));
    open(makeMe({ google, hasPassword: true }));

    expect(screen.getByText("amina@gmail.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Disconnect Google" }));
    await waitFor(() => expect(called).toHaveBeenCalled());
  });

  it("can't disconnect the only way to sign in, and says why", () => {
    open(makeMe({ google, hasPassword: false, github: null }));
    expect(screen.getByRole("button", { name: "Disconnect Google" })).toBeDisabled();
    expect(screen.getByText(/or you'd be locked out/)).toBeInTheDocument();
  });

  it("can disconnect when GitHub remains", () => {
    open(makeMe({ google, hasPassword: false, github }));
    expect(screen.getByRole("button", { name: "Disconnect Google" })).toBeEnabled();
  });
});

describe("Settings → GitHub unlink rule", () => {
  it("allows unlinking GitHub when Google remains, even without a password", () => {
    renderApp(<SettingsPage />, {
      user: makeMe({ github, google, hasPassword: false }),
      path: "/app/settings?tab=github",
    });
    expect(screen.getByRole("button", { name: "Unlink GitHub" })).toBeEnabled();
  });

  it("still refuses when GitHub is the only way in", () => {
    renderApp(<SettingsPage />, {
      user: makeMe({ github, google: null, hasPassword: false }),
      path: "/app/settings?tab=github",
    });
    expect(screen.getByRole("button", { name: "Unlink GitHub" })).toBeDisabled();
  });
});
