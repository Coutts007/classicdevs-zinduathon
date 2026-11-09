import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { makeMe, makeNotification, page } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { NotificationBell } from "./NotificationBell";

describe("NotificationBell", () => {
  it("shows the unread count and marks all read", async () => {
    let unread = [makeNotification(), makeNotification({ id: "n2", title: "Analysis finished" })];
    const readAll = vi.fn();
    server.use(
      http.get(`${API}/notifications`, () => HttpResponse.json(page(unread))),
      http.post(`${API}/notifications/read-all`, () => {
        readAll();
        unread = [];
        return HttpResponse.json({ updated: 2 });
      }),
    );
    renderApp(<NotificationBell allPath="/app/notifications" />, { user: makeMe() });
    const bell = await screen.findByRole("button", { name: "Notifications, 2 unread" });
    await userEvent.click(bell);
    expect(await screen.findByText("Analysis finished")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    await waitFor(() => expect(readAll).toHaveBeenCalledOnce());
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });
});
