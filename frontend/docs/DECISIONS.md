# Decisions (frontend)

## F-001 New app beside, not on top of, the teammate's prototype (Phase 1)

`frontend/myskill` (a React 19 JSX prototype) moved to `frontend-legacy/myskill` unchanged, as the
guidelines direct; the new TypeScript app lives at `frontend/`. Nothing was deleted.

## F-002 Stack versions follow the guidelines (Phase 1)

Vite 5, React 18, React Router 6 (data router, v7 future flags on), TanStack Query 5, Tailwind 3,
React Three Fiber 8 / drei 9 (the React 18 line). Pinned in `package-lock.json`.

## F-003 Generated types treat defaults as optional (Phase 1)

`openapi-typescript --default-non-nullable false`: otherwise request fields with a server default
(e.g. `consents.emailFeedback`) become required in TypeScript although the API doesn't need them.

## F-004 Paths keep the `/api/v1` prefix (Phase 1)

The OpenAPI paths include `/api/v1`, so the client's base URL is the API origin and calls read
`api.GET("/api/v1/me")`, which matches the backend docs and Swagger exactly.

## F-005 Static planet derived from the real scene (Phase 1)

The fallback image is a capture of the actual 3D scene, converted to transparent WebP by mapping
brightness to alpha (post-processing renders to an opaque buffer, so a direct transparent capture
isn't possible).

## F-006 Scrim glass for surfaces over the planet (Phase 1)

Default glass over the brightest rim fails AA for secondary text (2.4:1). Surfaces that can sit
over the rim use `GlassPanel scrim` (84% dark), tested in `src/lib/contrast.test.ts`.

## F-007 Backend fixes found by the frontend (Phase 1)

- `/health` didn't send CORS headers: the health middleware answered before `CorsMiddleware`.
  Moved after it (still before the Host check); regression test added.
- Backend tests read the developer's `backend/.env` for `FRONTEND_URL`/`CORS_ALLOWED_ORIGINS`;
  the test settings now pin them.
- Backend defaults now allow the Vite origin `http://localhost:5173`.

## F-008 Guards are components, not route loaders (Phase 2)

Auth state lives in React context (`AuthProvider`), which loaders can't read. `RequireAuth`
(roles, recruiter approval) and `GuestOnly` wrap routes instead; while the session is being
restored (refresh → `/me`) they render a splash, so protected screens never flash.

## F-009 Company is a text field at registration (Phase 2)

The guidelines ask for a company combobox (existing or new), but the API has no public list of
companies. The backend reuses an existing company case-insensitively, so free text gives the same
result. **Missing endpoint** if a picker is wanted: `GET /companies?search=`.

## F-010 E2E runs with reduced motion (Phase 2)

Headless Chromium renders WebGL in software; the 3D planet starved the page and made form submits
time out. Functional e2e tests use `reducedMotion: "reduce"` (static planet, which also exercises
that path); `screenshots.spec.ts` opts back into motion to capture the real scene.

## F-011 Sign out leaves the protected area first (Phase 2)

Clearing the session inside `/app` made the guard redirect to `/login?next=/app` before the
"go home" navigation ran. The menu navigates to `/` first, then signs out.

## F-012 Two backend schema bugs fixed while typing the card screens (Phase 3)

- Hand-paginated list endpoints (`/analyses`, `/candidates`, `/feedback`, `/jobs`, `/shortlists`,
  admin lists) were documented as bare arrays; the API returns `{count, next, previous, results}`.
  The backend now documents them with `paginated(...)` and a test guards it.
- The camelCase hook renamed path parameters (`publicId`) but not the `{public_id}` placeholders,
  making the spec invalid (21 places) and breaking generated clients. A post-processing hook
  restores the names; a test checks every path.

## F-013 Signing out is known to the guards (Phase 2 fix, Phase 3)

`signOut(exitTo)` records where to go; `RequireAuth` sends a deliberately signed-out user there
instead of `/login?next=…`. Navigating before signing out raced with React Router's
`startTransition` mode.

## F-014 Analysis flow (Phase 3)

`POST /analyses`: 202 → poll `GET /analyses/{id}` every 1.5 s (TanStack `refetchInterval`, paused in
background tabs) until completed/failed; 200 → the reused card is shown at once; 409 → we find the
running analysis in the history and resume polling it. Changed CV claims are saved first, because
the backend reruns when claims change. The `SpaceBackdrop` glow follows `progressStep` 1–4.
