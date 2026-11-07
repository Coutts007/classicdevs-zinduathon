import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { makeFeedback, makeMe, page } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { InboxPage } from "./InboxPage";

describe("InboxPage", () => {
  it("shows the empty state", async () => {
    server.use(http.get(`${API}/feedback`, () => HttpResponse.json(page([]))));
    renderApp(<InboxPage />, { user: makeMe() });
    expect(await screen.findByText("No feedback yet")).toBeInTheDocument();
  });

  it("opens a message and marks it read", async () => {
    const read = vi.fn();
    let readAt: string | null = null;
    server.use(
      http.get(`${API}/feedback`, () =>
        HttpResponse.json(
          page([
            makeFeedback({ readAt }),
            makeFeedback({
              id: "fb2",
              status: "not_a_fit",
              company: "Kilimo AI",
              readAt: "2026-11-05T00:00:00Z",
            }),
          ]),
        ),
      ),
      http.post(`${API}/feedback/fb1/read`, () => {
        read();
        readAt = new Date().toISOString();
        return HttpResponse.json(makeFeedback({ readAt: new Date().toISOString() }));
      }),
    );
    renderApp(<InboxPage />, { user: makeMe() });
    const row = (await screen.findByText("Savanna Tech")).closest("button")!;
    expect(row).toHaveTextContent("(unread)");
    await userEvent.click(row);
    await waitFor(() => expect(read).toHaveBeenCalledOnce());
    await waitFor(() => expect(row).not.toHaveTextContent("(unread)"));
  });

  it("filters by status", async () => {
    server.use(
      http.get(`${API}/feedback`, () =>
        HttpResponse.json(
          page([makeFeedback(), makeFeedback({ id: "fb2", status: "not_a_fit", company: "Kilimo AI" })]),
        ),
      ),
    );
    renderApp(<InboxPage />, { user: makeMe() });
    await screen.findByText("Kilimo AI");
    const filter = screen.getByRole("radiogroup", { name: "Filter by status" });
    await userEvent.click(within(filter).getByRole("radio", { name: "Not a fit" }));
    expect(screen.queryByText("Savanna Tech")).not.toBeInTheDocument();
    expect(screen.getByText("Kilimo AI")).toBeInTheDocument();
  });
});
