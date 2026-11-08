import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import type { CandidateDetail } from "@/lib/api/types";
import { makeCard, makeFeedback, page, recruiterMe } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { CandidatePage } from "./CandidatePage";

const detail = (over: Partial<CandidateDetail> = {}): CandidateDetail => ({
  candidate: {
    githubLogin: "amina-demo",
    name: "Amina Odhiambo",
    headline: "Full-stack developer",
    location: "Nairobi",
    avatarUrl: "",
    openToWork: true,
    signalScore: 94,
    analysedAt: "2026-11-06T09:00:00Z",
    topSkills: [{ name: "Django", label: "Strong" }],
  },
  card: makeCard(),
  shortlist: [],
  feedbackSent: [],
  ...over,
});

function setup(sent: unknown[] = []) {
  server.use(
    http.get(`${API}/candidates/amina-demo`, () => HttpResponse.json(detail())),
    http.get(`${API}/jobs`, () => HttpResponse.json(page([]))),
    http.post(`${API}/candidates/amina-demo/feedback`, async ({ request }) => {
      sent.push(await request.json());
      return HttpResponse.json(makeFeedback({ status: "interview" }), { status: 201 });
    }),
  );
  renderApp(<CandidatePage />, {
    user: recruiterMe("approved"),
    path: "/recruiter/candidates/amina-demo",
    route: "/recruiter/candidates/:login",
  });
}

describe("Feedback composer", () => {
  it("counts characters and blocks messages over 1,000", async () => {
    setup();
    const message = await screen.findByLabelText("Message");
    const send = screen.getByRole("button", { name: "Send feedback" });
    expect(send).toBeDisabled();
    await userEvent.type(message, "Great tests");
    expect(screen.getByText(/11\/1000 characters/)).toBeInTheDocument();
    expect(send).toBeEnabled();
    await userEvent.clear(message);
    await userEvent.click(message);
    await userEvent.paste("x".repeat(1001));
    expect(screen.getByText(/1001\/1000 characters/)).toBeInTheDocument();
    expect(send).toBeDisabled();
  });

  it("previews the email and SMS and sends the feedback", async () => {
    const sent: unknown[] = [];
    setup(sent);
    await userEvent.selectOptions(await screen.findByLabelText("Status"), "interview");
    await userEvent.type(screen.getByLabelText("Message"), "Your duka-api tests stood out.");
    expect(
      screen.getByText(/SkillProof: Savanna Fintech sent you feedback \(Interview\)/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    await waitFor(() =>
      expect(sent).toEqual([
        { status: "interview", message: "Your duka-api tests stood out.", jobPostingId: null },
      ]),
    );
    await waitFor(() => expect(screen.getByLabelText("Message")).toHaveValue(""));
  });

  it("shows the backend's message error on the field", async () => {
    server.use(
      http.get(`${API}/candidates/amina-demo`, () => HttpResponse.json(detail())),
      http.get(`${API}/jobs`, () => HttpResponse.json(page([]))),
      http.post(`${API}/candidates/amina-demo/feedback`, () =>
        HttpResponse.json(
          {
            code: "validation_error",
            message: "Invalid",
            fields: { message: ["Please keep it professional."] },
          },
          { status: 400 },
        ),
      ),
    );
    renderApp(<CandidatePage />, {
      user: recruiterMe("approved"),
      path: "/recruiter/candidates/amina-demo",
      route: "/recruiter/candidates/:login",
    });
    await userEvent.type(await screen.findByLabelText("Message"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please keep it professional.");
  });
});
