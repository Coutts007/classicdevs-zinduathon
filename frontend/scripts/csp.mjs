/**
 * The Content-Security-Policy for the built app, shared by the Netlify build (netlify-headers.mjs).
 * docker/40-runtime-config.sh writes the same policy for the nginx image; src/lib/csp.test.ts fails
 * if the two drift apart.
 *
 * Scripts, fonts and the page are same-origin only. Images also allow data: and blob: (inline SVG
 * backgrounds, planet textures). Inline styles are allowed because the UI sets style attributes.
 * connect-src lists the API's origin, which is the only cross-origin request the app makes.
 */

/** "https://api.example.com/api/v1" -> "https://api.example.com"; anything else -> null.
 *  Only plain URL characters are accepted, so a stray value can't inject CSP directives. */
export function originOf(url) {
  const match = /^(https?:\/\/[A-Za-z0-9._:-]+)/.exec(String(url ?? "").trim());
  return match ? match[1] : null;
}

/** @param {{ apiBaseUrl?: string, extraConnectSrc?: string }} options extra = space-separated origins */
export function buildCsp({ apiBaseUrl = "", extraConnectSrc = "" } = {}) {
  const connect = ["'self'"];
  for (const url of [apiBaseUrl, ...String(extraConnectSrc).split(/\s+/)]) {
    const origin = originOf(url);
    if (origin) connect.push(origin);
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
