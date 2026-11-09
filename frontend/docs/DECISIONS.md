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

## F-015 Inbox status filter is client-side (Phase 4)

`GET /feedback` has no `status` query parameter, so the inbox filters the current page (20 items)
in the browser and keeps the filter in the URL (`?status=`). If inboxes grow past one page, add a
`status` filter to the backend list and pass it through; the UI already reads it from the URL.

## F-016 `DELETE /me` body isn't in the schema (Phase 4)

drf-spectacular never documents request bodies for DELETE, so the generated type for
`DELETE /api/v1/me` has no body even though the view reads `{password}` (`MeDeleteSerializer`).
The settings page sends it with a single `as never` cast, commented at the call. Verified against
the real API: wrong password → 400, right password → 204.

## F-017 Notifications and preferences (Phase 4)

- The bell polls the unread list (`?unread=true&pageSize=5`) every 60 s, paused in background tabs;
  the count comes from the page's `count`. Mark read / mark all read are optimistic with rollback.
- Notification `linkPath` values are role-neutral (`/inbox`); the bell maps them into the current
  area (`/app/inbox`).
- The preferences matrix renders whatever kinds and channels `GET /me/notification-preferences`
  returns (camelCase keys) and sends `PUT` with snake_case `kind`/`channel` values. A channel a kind
  doesn't support shows a dash; SMS switches are disabled until `smsReady`.
- Password change returns a fresh token pair, stored at once, so this device stays signed in while
  others are signed out.

## F-018 Typed nested recruiting objects (Phase 5, backend change)

`Shortlist.candidate`, `Feedback.candidate` and `Job.requiredSkills` were method fields, so the
schema said `{[key]: unknown}` and the frontend would have needed hand-written types. The backend
now annotates them (`ShortlistCandidate`, `CandidateRef`, `RequiredSkill`); a schema test guards it.

## F-019 Recruiter screens built from what the API has (Phase 5)

- **Delivery status per channel** isn't exposed to recruiters (deliveries are admin-only), and the
  feedback create response doesn't say which channels were used. The composer's toast says "in
  their inbox, and by email and SMS if they've turned those on", and the sent list shows
  moderation (held/blocked) and read state, which the API does return.
- **"Recent candidates viewed"** has no recruiter endpoint (profile views are only exposed to the
  job seeker as counts). The dashboard shows recent shortlist activity instead.
- **Top match counts** on the dashboard: one `GET /jobs/{id}/matches?minMatch=75&pageSize=1` per
  open job (max 5), reading `count`.
- **Shortlist board** loads every page of `GET /shortlists` (it shows all stages at once). Moves are
  optimistic with rollback. Keyboard: dnd-kit's keyboard sensor with a custom coordinate getter
  that jumps column to column, plus a "Move to" menu on each card. Moving to Interview offers to
  send feedback through `PATCH /shortlists/{id}` `feedbackMessage`.
- Feedback preview shows the real templates (`recruiter_feedback/body.txt`, `sms.txt`): the SMS
  never carries the message itself.

## F-020 A rate-limited refresh never signs anyone out (Phase 5, backend change)

`POST /auth/token/refresh` is unauthenticated, so it shared the 60/hour **anon** budget per IP.
Every page load refreshes, so a busy office or a mobile carrier's NAT (common in Kenya) would
have signed everyone out with a 429. Backend: the view has its own scope, `token_refresh`
(600/hour per IP; rotated tokens can't be brute-forced). Frontend: `refreshSession()` returns
`ok | invalid | unavailable`; only `invalid` (400/401) clears tokens. On `unavailable` (429, 5xx,
offline) the middleware returns the original 401 without ending the session, and the bootstrap
retries up to three times, honouring `Retry-After` (capped at 10 s).

## F-021 Role-neutral links (Phase 5)

Notifications, emails and SMS link to `/inbox`, `/dashboard`, `/recruiter` and `/u/:login`. The
frontend serves `/inbox` and `/dashboard` as redirects: sign in if needed, then go to the user's
area (`resolveLink`). The bell and the notifications page use the same mapping.

## F-022 Guarded pages load after the guard (Phase 5)

React Router resolves a route's `lazy` for every matched route before rendering any of them, so a
signed-out visit to `/app` downloaded and ran the dashboard bundle (recharts included) before
`RequireAuth` could redirect to `/login`. Guarded routes now use `lazyPage()` (React.lazy inside
the element, with a skeleton fallback): the guard and shell render at once, and a signed-out
visitor never fetches page code. Public and auth routes keep route-level `lazy`.

## F-023 E2E runs on one worker; dev stack fixes (Phase 5)

- Playwright `workers: 1`. Every spec uses the same seeded accounts and changes their state
  (inbox read state, preferences, analyses), so parallel files raced each other, and four
  Chromiums on a laptop starved the dev server into timeouts.
- Mailpit runs with `--smtp-disable-rdns`. It reverse-resolved the Docker gateway before its
  SMTP greeting, which stalled every email, and so every sign-up, by ~10 s.
- Dev settings default `CONN_MAX_AGE` to 0. `runserver` uses a thread per request, and persistent
  connections outlived their threads until Postgres refused new clients after a long e2e session.

## F-022 Admin area (Phase 6, small backend changes)

- **Typed stats and deliveries.** `Stats.analysesPerDay` and `deliveryRates` were untyped dicts;
  they now have serializers (`AnalysesPerDay`, `DeliveryRate`). Dict keys from the API are
  camelised (`usersByRole.jobSeeker`), which the overview reads.
- **Delivery detail.** The spec asks for the recipient masked, the body and the provider response.
  `Delivery` now returns `recipient` masked server-side (`a***a@example.com`, `+2547******78`),
  plus `title`, `body` (the notification text) and `providerResponse` (JSON). Admins never receive
  full recipients in list responses.
- **Skills response type.** `aliases` was write-only in the schema although responses include it;
  responses now use `AdminSkillOut`.
- **Moderation** (`/admin/moderation`) uses the held-feedback endpoints that exist in the API but
  weren't listed in the spec's admin screens; the overview links to it when anything is held.
- **Recruiter queue** is oldest first (fair review order) with no search. Approve/reject buttons
  are labelled with name and email, so two people with the same name stay distinguishable.
  Approval needs a verified email (backend rule); the queue shows that status.
- **DataTable** sorts within the current page (the API pages and orders the data); filters and page
  numbers live in the URL. Role changes and suspensions go through a confirm dialog; the backend
  refuses changes to your own account.
- Charts render without animation: Recharts' entry animation restarted whenever the responsive
  container re-measured, so bars could be missing in captures and on slow devices.
