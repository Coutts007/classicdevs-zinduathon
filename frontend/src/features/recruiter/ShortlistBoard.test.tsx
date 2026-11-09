import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import type { Shortlist } from "@/lib/api/types";
import { page, recruiterMe } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { ShortlistBoard } from "./ShortlistBoard";

const entry = (over: Partial<Shortlist> = {}): Shortlist => ({
  id: "s1",
  candidate: { githubLogin: "amina-demo", name: "Amina Odhiambo", headline: "Full-stack developer" },
  jobPosting: null,
  stage: "saved",
  note: "",
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
  ...over,
});

describe("ShortlistBoard", () => {
  it("moves a card with the menu (no drag needed)", async () => {
    let stage = "saved";
    const patches: unknown[] = [];
    server.use(
      http.get(`${API}/shortlists`, () =>
        HttpResponse.json(page([entry({ stage: stage as Shortlist["stage"] })])),
      ),
      http.get(`${API}/jobs`, () => HttpResponse.json(page([]))),
      http.patch(`${API}/shortlists/s1`, async ({ request }) => {
        const body = (await request.json()) as { stage: string };
        patches.push(body);
        stage = body.stage;
        return HttpResponse.json(entry({ stage: body.stage as Shortlist["stage"] }));
      }),
    );
    renderApp(<ShortlistBoard />, { user: recruiterMe("approved") });
    const saved = await screen.findByRole("region", { name: "Saved, 1" });
    expect(within(saved).getByText("Amina Odhiambo")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Actions for Amina Odhiambo" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Offer" }));
    await waitFor(() => expect(patches).toEqual([{ stage: "offer" }]));
    expect(await screen.findByRole("region", { name: "Offer, 1" })).toBeInTheDocument();
  });

  it("offers to send feedback when moving to Interview", async () => {
    const patches: unknown[] = [];
    server.use(
      http.get(`${API}/shortlists`, () => HttpResponse.json(page([entry()]))),
      http.get(`${API}/jobs`, () => HttpResponse.json(page([]))),
      http.patch(`${API}/shortlists/s1`, async ({ request }) => {
        patches.push(await request.json());
        return HttpResponse.json(entry({ stage: "interview" }));
      }),
    );
    renderApp(<ShortlistBoard />, { user: recruiterMe("approved") });
    await userEvent.click(await screen.findByRole("button", { name: "Actions for Amina Odhiambo" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Interview" }));
    const dialog = await screen.findByRole("dialog", { name: "Move to Interview" });
    await userEvent.type(within(dialog).getByLabelText(/Message/), "Free on Thursday?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Move and send" }));
    await waitFor(() =>
      expect(patches).toEqual([{ stage: "interview", feedbackMessage: "Free on Thursday?" }]),
    );
  });
});
