import { defineConfig, devices } from "@playwright/test";

/**
 * E2E and screenshots. Start the backend (docker compose or `make run`) and the frontend
 * (`npm run dev`) first, or point E2E_BASE_URL at a running frontend.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  // The Vite dev server compiles routes on first visit; give assertions room.
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    // Functional tests use the static planet: software WebGL in headless Chromium would starve the
    // page. screenshots.spec.ts opts back in to motion to capture the real 3D scene.
    reducedMotion: "reduce",
    // Headless Chromium renders WebGL with SwiftShader, so the 3D planet works in CI too.
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
