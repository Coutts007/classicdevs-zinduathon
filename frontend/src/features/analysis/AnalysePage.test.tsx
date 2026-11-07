import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { makeAnalysis, makeCard, makeMe } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { AnalysePage } from "./AnalysePage";

const linked = makeMe({
  github: { login: "amina-demo", avatarUrl: "https://a/1.png", connectedAt: "2026-11-01T00:00:00Z" },
});

function claims(skills: string[] = []) {
  return http.get(`${API}/me/claimed-skills`, () =>
    HttpResponse.json({ skills: skills.map((rawText, position) => ({ rawText, position, skill: null })) }),
  );
}

describe("AnalysePage", () => {
  it("asks to connect GitHub when not linked", () => {
    server.use(claims());
    renderApp(<AnalysePage />, { user: makeMe() });
    expect(screen.getByRole("heading", { name: "Connect your GitHub account" })).toBeInTheDocument();
  });

  it("polls through the steps and reveals the card", async () => {
    const steps = [
      makeAnalysis({ progressStep: 2 }),
      makeAnalysis({ progressStep: 4 }),
      makeAnalysis({
        status: "completed",
        progressStep: 4,
        signalScore: 94,
        card: makeCard(),
        tips: ["Add tests to shop-app"],
      }),
    ];
    let polls = 0;
    server.use(
      claims(["React"]),
      http.post(`${API}/analyses`, () => HttpResponse.json({ id: "a1", status: "queued" }, { status: 202 })),
      http.get(`${API}/analyses/a1`, () => HttpResponse.json(steps[Math.min(polls++, steps.length - 1)])),
    );
    renderApp(<AnalysePage />, { user: linked });
    await userEvent.click(await screen.findByRole("button", { name: "Analyse my GitHub" }));
    expect(await screen.findByText("Reading your commits")).toBeInTheDocument();
    expect(await screen.findByText("Add tests to shop-app", {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Signal Score 94 out of 100" })).toBeInTheDocument();
    expect(polls).toBeGreaterThanOrEqual(3);
  }, 10_000);

  it("shows a reused card immediately (200 from POST)", async () => {
    server.use(
      claims(),
      http.post(`${API}/analyses`, () =>
        HttpResponse.json(
          makeAnalysis({ status: "completed", progressStep: 4, signalScore: 94, card: makeCard() }),
        ),
      ),
      http.get(`${API}/analyses/a1`, () =>
        HttpResponse.json(
          makeAnalysis({ status: "completed", progressStep: 4, signalScore: 94, card: makeCard() }),
        ),
      ),
    );
    renderApp(<AnalysePage />, { user: linked });
    await userEvent.click(await screen.findByRole("button", { name: "Analyse my GitHub" }));
    expect(
      await screen.findByText("Strongest evidence is in Testing across 3 public repositories."),
    ).toBeInTheDocument();
  });

  it("explains a failed analysis and offers a retry", async () => {
    server.use(
      claims(),
      http.post(`${API}/analyses`, () => HttpResponse.json({ id: "a1", status: "queued" }, { status: 202 })),
      http.get(`${API}/analyses/a1`, () =>
        HttpResponse.json(
          makeAnalysis({ status: "failed", errorCode: "no_public_repos", errorMessage: "x" }),
        ),
      ),
    );
    renderApp(<AnalysePage />, { user: linked });
    await userEvent.click(await screen.findByRole("button", { name: "Analyse my GitHub" }));
    expect(await screen.findByText(/no public repositories yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("saves changed claims before starting", async () => {
    let saved: unknown;
    server.use(
      claims([]),
      http.get(`${API}/skills`, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ name: "React", slug: "react", category: "framework" }],
        }),
      ),
      http.put(`${API}/me/claimed-skills`, async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json({ skills: [{ rawText: "React", position: 0, skill: null }] });
      }),
      http.post(`${API}/analyses`, () => HttpResponse.json({ id: "a1", status: "queued" }, { status: 202 })),
      http.get(`${API}/analyses/a1`, () =>
        HttpResponse.json(makeAnalysis({ status: "running", progressStep: 1 })),
      ),
    );
    renderApp(<AnalysePage />, { user: linked });
    await userEvent.type(await screen.findByRole("combobox"), "Rea");
    await userEvent.click(await screen.findByRole("option", { name: /React/ }));
    await userEvent.click(screen.getByRole("button", { name: "Analyse my GitHub" }));
    await waitFor(() => expect(saved).toEqual({ skills: ["React"] }));
  });
});
