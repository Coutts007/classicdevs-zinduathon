import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";

import type { AdminUser, Delivery, RecruiterQueue } from "@/lib/api/types";
import { makeMe, page } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { DeliveriesPage } from "./DeliveriesPage";
import { RecruitersPage } from "./RecruitersPage";
import { UsersPage } from "./UsersPage";

const admin = makeMe({
  id: "admin-1",
  role: "admin",
  email: "admin@skillproof.demo",
  jobSeekerProfile: null,
});

const pending: RecruiterQueue = {
  id: "r1",
  email: "otieno@kilimo.demo",
  fullName: "Otieno Kamau",
  emailVerified: true,
  company: "Kilimo AI",
  jobTitle: "CTO",
  approvalStatus: "pending",
  reviewNote: "",
  reviewedAt: null,
  createdAt: "2026-11-07T08:00:00Z",
};

describe("Admin: recruiter approvals", () => {
  it("approves with an optional note", async () => {
    const calls: unknown[] = [];
    server.use(
      http.get(`${API}/admin/recruiters`, () => HttpResponse.json(page([pending]))),
      http.post(`${API}/admin/recruiters/r1/approve`, async ({ request }) => {
        calls.push(await request.json());
        return HttpResponse.json({ ...pending, approvalStatus: "approved" });
      }),
    );
    renderApp(<RecruitersPage />, { user: admin });
    await userEvent.click(
      await screen.findByRole("button", { name: "Approve Otieno Kamau (otieno@kilimo.demo)" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Approve recruiter" });
    await userEvent.type(within(dialog).getByLabelText(/Note/), "Welcome");
    await userEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(calls).toEqual([{ note: "Welcome" }]));
  });

  it("requires a reason to reject", async () => {
    server.use(http.get(`${API}/admin/recruiters`, () => HttpResponse.json(page([pending]))));
    renderApp(<RecruitersPage />, { user: admin });
    await userEvent.click(
      await screen.findByRole("button", { name: "Reject Otieno Kamau (otieno@kilimo.demo)" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Reject recruiter" });
    expect(within(dialog).getByRole("button", { name: "Reject" })).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Reason/), "Not a real company");
    expect(within(dialog).getByRole("button", { name: "Reject" })).toBeEnabled();
  });
});

describe("Admin: users", () => {
  const user: AdminUser = {
    id: "u2",
    email: "chebet@jobseeker.demo",
    fullName: "Chebet Kiprono",
    role: "job_seeker",
    phone: null,
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    githubLogin: "chebet-demo",
    approvalStatus: null,
    company: null,
    lastLogin: null,
    dateJoined: "2026-11-01T00:00:00Z",
  };

  it("suspends after confirmation", async () => {
    const patches: unknown[] = [];
    server.use(
      http.get(`${API}/admin/users`, () => HttpResponse.json(page([user]))),
      http.patch(`${API}/admin/users/u2`, async ({ request }) => {
        patches.push(await request.json());
        return HttpResponse.json({ ...user, isActive: false });
      }),
    );
    renderApp(<UsersPage />, { user: admin });
    await userEvent.click(await screen.findByRole("button", { name: "Suspend" }));
    const dialog = await screen.findByRole("dialog", { name: "Suspend Chebet Kiprono?" });
    expect(patches).toEqual([]);
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(patches).toEqual([{ isActive: false }]));
  });

  it("shows the backend's reason when a role change is refused", async () => {
    server.use(
      http.get(`${API}/admin/users`, () => HttpResponse.json(page([user]))),
      http.patch(`${API}/admin/users/u2`, () =>
        HttpResponse.json(
          {
            code: "validation_error",
            message: "Invalid",
            fields: { role: ["This user has no recruiter profile."] },
          },
          { status: 400 },
        ),
      ),
    );
    const error = vi.spyOn(toast, "error");
    renderApp(<UsersPage />, { user: admin });
    await userEvent.selectOptions(await screen.findByLabelText("Role for Chebet Kiprono"), "recruiter");
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("This user has no recruiter profile."));
    error.mockRestore();
  });
});

describe("Admin: deliveries", () => {
  it("shows the detail with masked recipient and retries a failed delivery", async () => {
    const failed: Delivery = {
      id: "d1",
      kind: "recruiter_feedback",
      user: "amina@jobseeker.demo",
      channel: "sms",
      provider: "thrivewave",
      recipient: "+2547******78",
      status: "failed",
      attempts: 1,
      lastError: "Provider timeout",
      providerMessageId: "",
      providerResponse: { error: "timeout" },
      title: "Savanna Fintech sent you feedback",
      body: "Grace at Savanna Fintech: Interview.",
      sentAt: null,
      deliveredAt: null,
      createdAt: "2026-11-07T08:00:00Z",
    };
    const retried = vi.fn();
    server.use(
      http.get(`${API}/admin/notification-deliveries`, () => HttpResponse.json(page([failed]))),
      http.post(`${API}/admin/notification-deliveries/d1/retry`, () => {
        retried();
        return HttpResponse.json({ ...failed, status: "queued" });
      }),
    );
    renderApp(<DeliveriesPage />, { user: admin });
    await userEvent.click(await screen.findByRole("button", { name: /Details for/ }));
    const dialog = await screen.findByRole("dialog", { name: "Savanna Fintech sent you feedback" });
    expect(within(dialog).getByText("+2547******78")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Provider response JSON")).toHaveTextContent('"error": "timeout"');
    await userEvent.click(within(dialog).getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(retried).toHaveBeenCalledOnce());
  });
});
