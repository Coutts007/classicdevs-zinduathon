import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useState } from "react";

import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { ChipInput } from "./ChipInput";

function Harness({ initial = [] as string[], max = 12 }) {
  const [value, setValue] = useState(initial);
  return <ChipInput value={value} onChange={setValue} max={max} />;
}

beforeEach(() => {
  server.use(
    http.get(`${API}/skills`, ({ request }) => {
      const q = new URL(request.url).searchParams.get("search") ?? "";
      const all = [
        { name: "React", slug: "react", category: "framework" },
        { name: "Django", slug: "django", category: "framework" },
      ];
      return HttpResponse.json({
        count: 2,
        next: null,
        previous: null,
        results: all.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())),
      });
    }),
  );
});

describe("ChipInput", () => {
  it("adds a catalogue suggestion with the keyboard", async () => {
    renderApp(<Harness />);
    await userEvent.type(screen.getByRole("combobox"), "dja");
    expect(await screen.findByRole("option", { name: /Django/ })).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Remove Django" })).toBeInTheDocument();
  });

  it("adds free text and ignores case-insensitive duplicates", async () => {
    renderApp(<Harness initial={["Kubernetes"]} />);
    await userEvent.type(screen.getByRole("combobox"), "kubernetes{Enter}");
    expect(screen.getAllByRole("button", { name: /Remove/ })).toHaveLength(1);
    await userEvent.type(screen.getByRole("combobox"), "Elixir{Enter}");
    expect(screen.getByRole("button", { name: "Remove Elixir" })).toBeInTheDocument();
  });

  it("removes with Backspace and stops at the maximum", async () => {
    renderApp(<Harness initial={["A", "B"]} max={2} />);
    expect(screen.getByRole("combobox")).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Remove B" }));
    const input = screen.getByRole("combobox");
    expect(input).toBeEnabled();
    await userEvent.type(input, "{Backspace}");
    expect(screen.queryByRole("button", { name: "Remove A" })).not.toBeInTheDocument();
  });
});
