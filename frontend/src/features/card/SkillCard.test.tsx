import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { makeCard } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { PublicCardPage } from "./PublicCardPage";
import { SkillCard } from "./SkillCard";

describe("SkillCard", () => {
  it("shows every number with its reason, evidence, claims, flags and the AI label", async () => {
    renderApp(<SkillCard card={makeCard()} tips={["Add tests to shop-app"]} />);
    expect(screen.getByRole("img", { name: "Signal Score 94 out of 100" })).toBeInTheDocument();
    expect(screen.getByText("Active in 44 of the last 52 weeks")).toBeInTheDocument();
    expect(screen.getByText(/never sets a score/)).toBeInTheDocument();
    expect(screen.getByText("verified owner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /shop-app/ })).toHaveAttribute(
      "href",
      "https://github.com/amina-demo/shop-app",
    );
    expect(screen.getByText("CI")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("Mostly one commit")).toBeInTheDocument();
    expect(screen.getByText("Add tests to shop-app")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Testing/ }));
    expect(screen.queryByRole("link", { name: /shop-app/ })).not.toBeInTheDocument();
  });
});

describe("PublicCardPage", () => {
  it("loads a card and invites visitors to get their own", async () => {
    server.use(http.get(`${API}/cards/amina-demo`, () => HttpResponse.json(makeCard())));
    renderApp(<PublicCardPage />, { path: "/u/amina-demo", route: "/u/:login" });
    expect(await screen.findByRole("heading", { name: "Amina Odhiambo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get your own card/ })).toBeInTheDocument();
    expect(document.title).toContain("Signal Score 94");
  });

  it("explains a missing card", async () => {
    server.use(
      http.get(`${API}/cards/nobody`, () =>
        HttpResponse.json({ code: "not_found", message: "No card" }, { status: 404 }),
      ),
    );
    renderApp(<PublicCardPage />, { path: "/u/nobody", route: "/u/:login" });
    expect(await screen.findByText("No skill card for @nobody yet")).toBeInTheDocument();
  });
});
