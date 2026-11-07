import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { makeMe } from "@/test/fixtures";
import { API, server } from "@/test/server";

import { useAuth } from "./auth-context";
import { AuthProvider } from "./AuthProvider";
import { tokens } from "./tokens";

function Probe() {
  const { status, user } = useAuth();
  return <p>{status === "signed-in" ? `hello ${user?.fullName}` : status}</p>;
}

const renderProvider = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );

describe("AuthProvider bootstrap", () => {
  beforeEach(() => tokens.clear());

  it("is signed out without a refresh token", () => {
    renderProvider();
    expect(screen.getByText("signed-out")).toBeInTheDocument();
  });

  it("restores a session: refresh, then /me", async () => {
    window.localStorage.setItem("skillproof.refresh", "R1");
    server.use(
      http.post(`${API}/auth/token/refresh`, () => HttpResponse.json({ access: "A2", refresh: "R2" })),
      http.get(`${API}/me`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer A2"
          ? HttpResponse.json(makeMe())
          : HttpResponse.json({}, { status: 401 }),
      ),
    );
    renderProvider();
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("hello Amina Odhiambo")).toBeInTheDocument();
    expect(tokens.refresh()).toBe("R2");
  });

  it("falls back to signed out when the stored refresh token is dead", async () => {
    window.localStorage.setItem("skillproof.refresh", "OLD");
    server.use(
      http.post(`${API}/auth/token/refresh`, () =>
        HttpResponse.json({ code: "token_invalid" }, { status: 401 }),
      ),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByText("signed-out")).toBeInTheDocument());
    expect(tokens.refresh()).toBeNull();
  });
});
