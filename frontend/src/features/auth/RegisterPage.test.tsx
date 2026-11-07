import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AuthContext, type AuthState } from "@/lib/auth/auth-context";
import { makeMe } from "@/test/fixtures";
import { API, server } from "@/test/server";

import { RegisterPage, registerSchema } from "./RegisterPage";

const base = {
  role: "job_seeker" as const,
  fullName: "Amina",
  email: "a@b.co",
  password: "correct-horse",
  phone: "",
  companyName: "",
  jobTitle: "",
  consents: { terms: true, emailFeedback: true, smsFeedback: false },
};

describe("registration rules", () => {
  const issues = (v: unknown) =>
    (registerSchema.safeParse(v).error?.issues ?? []).map((i) => i.path.join("."));

  it("accepts a minimal job seeker", () => expect(issues(base)).toEqual([]));
  it("requires the terms", () =>
    expect(issues({ ...base, consents: { ...base.consents, terms: false } })).toContain("consents.terms"));
  it("requires a phone when SMS is ticked", () =>
    expect(issues({ ...base, consents: { ...base.consents, smsFeedback: true } })).toContain("phone"));
  it("validates Kenyan phone formats", () => {
    expect(issues({ ...base, phone: "0712 345 678" })).toEqual([]);
    expect(issues({ ...base, phone: "0712" })).toContain("phone");
  });
  it("requires a company for recruiters", () =>
    expect(issues({ ...base, role: "recruiter" })).toContain("companyName"));
});

function renderRegister(path = "/register?role=job_seeker") {
  const signIn = vi.fn();
  const auth: AuthState = { status: "signed-out", user: null, signIn, signOut: vi.fn(), refreshMe: vi.fn() };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app" element={<p>dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { signIn };
}

describe("RegisterPage", () => {
  it("starts with the role choice", async () => {
    renderRegister("/register");
    await userEvent.click(screen.getByRole("button", { name: /I'm looking for work/ }));
    expect(screen.getByRole("heading", { name: "Create your skill card" })).toBeInTheDocument();
  });

  it("shows backend field errors next to the fields", async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          {
            code: "validation_error",
            message: "x",
            fields: { email: ["An account with this email already exists."] },
          },
          { status: 400 },
        ),
      ),
    );
    renderRegister();
    await userEvent.type(screen.getByLabelText("Full name"), "Amina");
    await userEvent.type(screen.getByLabelText("Email"), "taken@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await userEvent.click(screen.getByRole("checkbox", { name: /I accept the/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(screen.getByText("Check the highlighted fields.")).toBeInTheDocument();
  });

  it("signs in and goes to the dashboard on success, sending E.164 phones", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ access: "A", refresh: "R", user: makeMe() }, { status: 201 });
      }),
    );
    const { signIn } = renderRegister();
    await userEvent.type(screen.getByLabelText("Full name"), "Amina");
    await userEvent.type(screen.getByLabelText("Email"), "amina@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await userEvent.type(screen.getByLabelText(/Phone/), "0712345678");
    await userEvent.click(screen.getByRole("checkbox", { name: /I accept the/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(await screen.findByText("dashboard")).toBeInTheDocument();
    expect(body).toMatchObject({
      role: "job_seeker",
      phone: "+254712345678",
      consents: { terms: true, emailFeedback: true, smsFeedback: false },
    });
  });
});
