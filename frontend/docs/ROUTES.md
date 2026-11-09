# Routes

Every route, who can open it, and what it calls. Paths below are relative to `/api/v1`.

## Public

| Route                  | Screen                                                                                 | Endpoints                      |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------ |
| `/`                    | Landing: pill nav, hero, Signal Planet, how it works, scoring, for recruiters, privacy | `GET /health` (dev status dot) |
| `/u/:login`            | Public skill card                                                                      | `GET /cards/{github_login}`    |
| `/terms`, `/privacy`   | Draft legal pages ("Draft, not legal advice")                                          | –                              |
| `/inbox`, `/dashboard` | Redirects for links in emails/SMS/notifications (sign in first if needed)              | `GET /me`                      |
| `*`                    | Not found                                                                              | –                              |

## Auth (guests only, except where noted)

| Route                   | Screen                                                              | Endpoints                                        |
| ----------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| `/login`                | Sign in (email/password, GitHub)                                    | `POST /auth/login`, `GET /auth/github/authorize` |
| `/register`             | Two steps: role, then details + consents                            | `POST /auth/register`                            |
| `/forgot-password`      | Request reset link                                                  | `POST /auth/password/reset`                      |
| `/reset-password`       | Set new password from link (any state)                              | `POST /auth/password/reset/confirm`              |
| `/verify-email`         | Confirm email from link (any state)                                 | `POST /auth/email/verify`                        |
| `/auth/github/callback` | Finish GitHub sign-in / link (any state)                            | `POST /auth/github/callback`                     |
| `/recruiter/pending`    | Recruiter approval status (signed-in recruiter, any approval state) | `GET /me`                                        |

## Job seeker (`/app`, role `job_seeker`)

| Route                | Screen                                                                                                   | Endpoints                                                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/app`               | Dashboard: score, change, top skills, tips, recent feedback, profile views                               | `GET /analyses`, `GET /analyses/{id}`, `GET /feedback`, `GET /me/profile-views`                                                                                                                                                  |
| `/app/analyse`       | Claimed skills, run analysis, live progress, result                                                      | `GET/PUT /me/claimed-skills`, `GET /skills`, `POST /analyses`, `GET /analyses/{id}`                                                                                                                                              |
| `/app/card`          | My card + share link, visibility, open to work                                                           | `GET /cards/{login}`, `PATCH /me`                                                                                                                                                                                                |
| `/app/history`       | Score over time, past analyses                                                                           | `GET /analyses`                                                                                                                                                                                                                  |
| `/app/inbox`         | Recruiter feedback list + detail (mark read on open)                                                     | `GET /feedback`, `POST /feedback/{id}/read`                                                                                                                                                                                      |
| `/app/jobs`          | Open jobs, "How well do I match?"                                                                        | `GET /jobs?status=open`, `GET /jobs/{id}/match/me`                                                                                                                                                                               |
| `/app/notifications` | All notifications, mark read / all read                                                                  | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`                                                                                                                                            |
| `/app/settings`      | Profile, Contact (+ phone verify), GitHub, Notifications, Privacy (visibility, export, delete), Password | `GET/PATCH /me`, `POST /auth/phone/send-code`, `POST /auth/phone/verify`, `DELETE /auth/github`, `GET/PUT /me/notification-preferences`, `GET /me/export`, `DELETE /me`, `POST /auth/password/change`, `POST /auth/email/resend` |

## Recruiter (`/recruiter`, role `recruiter`, approved)

| Route                                             | Screen                                                                                       | Endpoints                                                                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/recruiter`                                      | Dashboard: open jobs + 75%+ match counts, shortlist by stage, recent activity, feedback sent | `GET /jobs`, `GET /jobs/{id}/matches`, `GET /shortlists`, `GET /feedback`                                                             |
| `/recruiter/candidates`                           | Search with URL-synced filters                                                               | `GET /candidates`, `GET /skills`                                                                                                      |
| `/recruiter/candidates/:login`                    | Card + shortlist control + feedback composer + history                                       | `GET /candidates/{login}`, `POST /candidates/{login}/feedback`, `POST /shortlists`, `PATCH /shortlists/{id}`, `GET /jobs?status=open` |
| `/recruiter/jobs`                                 | Job postings by status                                                                       | `GET /jobs`                                                                                                                           |
| `/recruiter/jobs/new`, `/recruiter/jobs/:id/edit` | Job form (draft/publish, required skills)                                                    | `POST /jobs`, `PATCH /jobs/{id}`, `GET /skills`                                                                                       |
| `/recruiter/jobs/:id`                             | Job detail, ranked matches, publish/close/delete                                             | `GET /jobs/{id}`, `GET /jobs/{id}/matches`, `PATCH /jobs/{id}`, `DELETE /jobs/{id}`, `POST /shortlists`                               |
| `/recruiter/shortlists`                           | Board by stage (drag, keyboard, "Move to" menu)                                              | `GET /shortlists`, `PATCH /shortlists/{id}`, `DELETE /shortlists/{id}`, `GET /jobs`                                                   |
| `/recruiter/feedback`                             | Feedback sent (moderation and read state)                                                    | `GET /feedback`                                                                                                                       |
| `/recruiter/notifications`, `/recruiter/settings` | As for job seekers (no GitHub tab; company read-only)                                        | shared                                                                                                                                |

## Admin (`/admin`, role `admin`)

| Route                                     | Screen                                                        | Endpoints                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin`                                  | Overview stats and charts, links to Django admin and API docs | `GET /admin/stats`                                                                                                                                      |
| `/admin/recruiters`                       | Approval queue by status; approve / reject with note          | `GET /admin/recruiters`, `POST /admin/recruiters/{id}/approve`, `/reject`                                                                               |
| `/admin/users`                            | Search, filter, suspend/reactivate, change role               | `GET /admin/users`, `PATCH /admin/users/{id}`                                                                                                           |
| `/admin/analyses`                         | All analyses, status, score, duration, open card              | `GET /analyses` (admin scope)                                                                                                                           |
| `/admin/skills`                           | Skill catalogue and dependency mappings, inline edit          | `GET/POST /admin/skills`, `PATCH /admin/skills/{slug}`, `GET/POST /admin/dependency-mappings`, `PATCH /admin/dependency-mappings/{ecosystem}/{package}` |
| `/admin/deliveries`                       | Email/SMS deliveries, detail, retry failed                    | `GET /admin/notification-deliveries`, `POST …/{id}/retry`                                                                                               |
| `/admin/moderation`                       | Feedback held by the filter: release or reject                | `GET /admin/feedback/held`, `POST /admin/feedback/{id}/release`, `/reject`                                                                              |
| `/admin/audit-log`                        | Filter by actor, action, dates; metadata JSON                 | `GET /admin/audit-log`                                                                                                                                  |
| `/admin/notifications`, `/admin/settings` | Shared                                                        | shared                                                                                                                                                  |

## Development only

`/dev/ui` (component gallery + API connection check), `/dev/planet-capture` (renders the static
planet image).
