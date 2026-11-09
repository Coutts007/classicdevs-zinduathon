# Deploying the frontend to Netlify

The frontend is a static single-page app, so Netlify serves the output of `npm run build`. The API
runs elsewhere (Render, see `backend/render.yaml`). Everything that nginx did in the Docker image is
done here with files: `public/_redirects`, `dist/_headers` (generated) and `netlify.toml`.

## One-time setup

1. **Deploy the backend first** and note its URL, for example `https://skillproof-api.onrender.com`.
2. In Netlify: **Add new site → Import an existing project**, pick this repository.
3. Set **Base directory** to `frontend`. The build command and publish directory come from
   `netlify.toml`; leave them as detected.
4. Add the **environment variables** below, then deploy.
5. Copy the site's URL (`https://<name>.netlify.app`) into the backend: `FRONTEND_URL` and
   `CORS_ALLOWED_ORIGINS` (no trailing slash), and redeploy the backend.
6. Point the OAuth apps at the site: GitHub callback `https://<site>/auth/github/callback`, and
   Google's authorized redirect URI `https://<site>/auth/google/callback`.

## Environment variables (build time)

Netlify is static hosting, so there is no start-up step that can inject settings: these are read
**while building** and baked into the bundle. Changing one means a new deploy.

| Variable                | Value                                  | Notes                                                                                                |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | `https://<api-host>/api/v1`            | **Required.** A production build fails without it (or if it points at localhost). Also sets the CSP. |
| `VITE_DJANGO_ADMIN_URL` | `https://<api-host>/django-admin/`     | Link on the admin overview.                                                                          |
| `VITE_API_DOCS_URL`     | `https://<api-host>/api/v1/docs/`      | Link in the admin menu.                                                                              |
| `VITE_APP_URL`          | `https://<site>` or your custom domain | Optional. Defaults to the site's own URL. Used for share links.                                      |
| `CSP_CONNECT_SRC`       | extra origins, space-separated         | Optional. Only if the app must call another origin besides the API.                                  |
| `NODE_VERSION`          | `20`                                   | Already set in `netlify.toml`.                                                                       |

## What the build does

`netlify.toml` runs `npm run build:netlify`: the normal build (which also regenerates the API types
from `../backend/openapi.yaml`; Netlify clones the whole repo, so that file is there), then
`scripts/netlify-headers.mjs`, which writes `dist/_headers`:

- security headers on every path (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`);
- a **Content-Security-Policy** whose `connect-src` is `'self'` plus the origin of `VITE_API_BASE_URL`.
  It is the same policy the nginx image uses, and `src/lib/csp.test.ts` fails if the two differ;
- long-lived caching for `/assets/*`, and no caching for `index.html` and `config.js`.

`public/_redirects` sends every path that is not a real file to `index.html`, so deep links such as
`/app/card` work after a refresh.

## Things to know

- **Changing the API URL needs a rebuild.** Edit the variable, then use _Trigger deploy → Clear cache
  and deploy site_.
- **Deploy previews** are built, but the API will refuse their origin (CORS) unless you add the
  preview URL to the backend's `CORS_ALLOWED_ORIGINS`. Previews only warn about a missing API URL;
  production builds fail.
- **Custom domain:** update `VITE_APP_URL`, the backend's `FRONTEND_URL` / `CORS_ALLOWED_ORIGINS`,
  and both OAuth callbacks.
- **Docker / nginx:** `Dockerfile` and `docker/` still work for hosts that run containers; they read
  runtime variables (`API_BASE_URL`, `APP_URL`, ...) instead. See `README.md`.

## Troubleshooting

| Symptom                                                     | Likely cause                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Build fails: "`VITE_API_BASE_URL` is not set"               | Add it under the site's environment variables.                                                            |
| Page loads, every API call fails with a CORS error          | The backend's `CORS_ALLOWED_ORIGINS` doesn't contain this site's exact `https://` origin.                 |
| Console: "violates Content Security Policy ... connect-src" | The request goes to an origin that isn't `VITE_API_BASE_URL`'s. Add it to `CSP_CONNECT_SRC` and redeploy. |
| Refreshing `/app/...` gives "Page not found"                | `public/_redirects` is missing from the build output.                                                     |
| GitHub/Google sign-in says the redirect URI is wrong        | The callback registered with the provider must be exactly `https://<site>/auth/<provider>/callback`.      |
