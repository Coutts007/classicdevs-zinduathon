# Testing

| Kind             | Command                          | What                                                                 |
| ---------------- | -------------------------------- | -------------------------------------------------------------------- |
| Types            | `npm run typecheck`              | TypeScript strict, including e2e                                     |
| Lint             | `npm run lint`                   | ESLint (typescript, react-hooks, jsx-a11y, react-refresh) + Prettier |
| API types        | `npm run api:types:check`        | `schema.d.ts` matches `backend/openapi.yaml`                         |
| Unit / component | `npm run test`                   | Vitest + Testing Library + MSW (jsdom)                               |
| End to end       | `npx playwright test e2e/<spec>` | Playwright against the real backend                                  |
| Screenshots      | `npm run screenshots`            | every route at 390 and 1440 px into `e2e/__screenshots__/`           |

## Unit and component tests

- `src/test/server.ts` is one MSW server; tests add handlers with `server.use(...)`. Requests the
  test didn't expect fail the test (`onUnhandledRequest: "error"`).
- Fixtures in `src/test/fixtures.ts` are typed from the generated schema, so a backend change that
  breaks a payload breaks the fixture at compile time.
- `renderApp(ui, { user, path, route })` gives a component Query, auth state, the progress glow and
  a router.
- Covered: refresh middleware (single flight, retry once, sign out on rejected refresh, keep
  session on 429), error mapping, guards per role/approval, registration rules, analysis polling,
  chip input, preferences matrix, inbox mark-read and filter, bell, feedback composer (counter,
  validation, preview, backend field errors), shortlist board (menu moves, Interview → feedback),
  admin approvals/users/deliveries, glass components and contrast.

## End to end

Prerequisites:

1. Backend services and demo data: in `backend/`, `make services && make migrate`, then
   `python manage.py seed_demo`.
2. Backend API with relaxed limits for the test run (the suite signs in many times a minute from
   one IP, and the seeded analyses must count as fresh):

   ```bash
   THROTTLE_SCALE=50 ANALYSIS_CACHE_HOURS=8760 \
   FRONTEND_URL=http://localhost:5173 CORS_ALLOWED_ORIGINS=http://localhost:5173 \
   python manage.py runserver 8000
   ```

3. Frontend: `npm run dev` (or set `E2E_BASE_URL` to another URL).
4. Mailpit on `http://localhost:8025` (from `make services`; `MAILPIT_URL` overrides): flow 3 reads
   the verification email from its API.

Specs (one worker; they share the seeded accounts):

| Spec                  | Covers                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.spec.ts`        | sign in/out per role, `?next=`, reload restores session, wrong password, recruiter sign-up → pending                                      |
| `card.spec.ts`        | flow 1: dashboard → analyse → card → share link signed out; unknown card                                                                  |
| `inbox.spec.ts`       | inbox read, bell, preferences persist, data export download                                                                               |
| `recruiter.spec.ts`   | flow 2: search by skill → candidate → feedback → seeker inbox; job draft → publish → matches → delete; board move                         |
| `admin.spec.ts`       | flow 3: pending recruiter blocked → email verified → admin approves → recruiter searches; delivery log email + SMS rows; every admin page |
| `a11y.spec.ts`        | axe (WCAG 2.1 A/AA) on every route for every role: no serious or critical violations                                                      |
| `responsive.spec.ts`  | no route scrolls sideways at 360 or 768 px                                                                                                |
| `screenshots.spec.ts` | review set (not assertions)                                                                                                               |

Functional specs run with `reducedMotion: "reduce"` (static planet): headless Chromium only has a
software WebGL renderer. The screenshot spec opts back in and opens the landing page with
`?force-3d`.

The e2e runs leave test users (`e2e-…@example.com`) and jobs behind in the dev database; re-seed
or ignore them.

## Reviewing screenshots

Open `e2e/__screenshots__/` (git-ignored). Check each screen at both widths: no horizontal scroll,
glass panels readable over the planet, focus rings visible, empty and error states sensible.
