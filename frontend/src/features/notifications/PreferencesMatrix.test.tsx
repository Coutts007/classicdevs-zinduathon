import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { makeMe } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { PreferencesMatrix } from "./PreferencesMatrix";

const matrix = (smsReady: boolean, feedbackEmail = true) => ({
  smsReady,
  matrix: {
    analysisCompleted: { inApp: true, email: true },
    recruiterFeedback: { inApp: true, email: feedbackEmail, sms: false },
  },
});

describe("PreferencesMatrix", () => {
  it("disables SMS until the phone is verified", async () => {
    server.use(http.get(`${API}/me/notification-preferences`, () => HttpResponse.json(matrix(false))));
    renderApp(<PreferencesMatrix />, { user: makeMe() });
    expect(await screen.findByRole("switch", { name: "Recruiter feedback: SMS" })).toBeDisabled();
    expect(screen.getByText(/SMS needs a verified phone number/)).toBeInTheDocument();
    // Kinds without an SMS channel show a dash, not a switch.
    expect(screen.queryByRole("switch", { name: "Analysis finished: SMS" })).not.toBeInTheDocument();
  });

  it("sends snake_case kind and channel when a switch changes", async () => {
    let sent: unknown;
    server.use(
      http.get(`${API}/me/notification-preferences`, () => HttpResponse.json(matrix(true))),
      http.put(`${API}/me/notification-preferences`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(matrix(true, false));
      }),
    );
    renderApp(<PreferencesMatrix />, { user: makeMe() });
    const email = await screen.findByRole("switch", { name: "Recruiter feedback: Email" });
    expect(email).toBeChecked();
    await userEvent.click(email);
    await waitFor(() =>
      expect(sent).toEqual({
        preferences: [{ kind: "recruiter_feedback", channel: "email", enabled: false }],
      }),
    );
    expect(screen.getByRole("switch", { name: "Recruiter feedback: Email" })).not.toBeChecked();
  });
});
