import { readFileSync } from "node:fs";

import { buildCsp, originOf } from "../../scripts/csp.mjs";
import { checkApiUrl, renderHeaders } from "../../scripts/netlify-headers.mjs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("originOf", () => {
  it("keeps scheme, host and port, and drops the path", () => {
    expect(originOf("https://skillproof-api.onrender.com/api/v1")).toBe(
      "https://skillproof-api.onrender.com",
    );
    expect(originOf("http://localhost:8000/api/v1/")).toBe("http://localhost:8000");
  });
  it.each(["", "not a url", "ftp://x.test", "javascript:alert(1)", null, undefined])("rejects %s", (value) =>
    expect(originOf(value)).toBeNull(),
  );
});

describe("buildCsp", () => {
  it("allows only same-origin scripts and the API's origin for requests", () => {
    const csp = buildCsp({ apiBaseUrl: "https://api.example.test/api/v1" });
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self' https://api.example.test;");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("adds extra origins and ignores anything that isn't a plain URL", () => {
    const csp = buildCsp({
      apiBaseUrl: "https://api.example.test/api/v1",
      extraConnectSrc: "https://stats.example.test  evil;script-src * https://x.test'",
    });
    expect(csp).toContain(
      "connect-src 'self' https://api.example.test https://stats.example.test https://x.test;",
    );
    expect(csp).not.toContain("script-src *");
    expect(csp).not.toContain("evil");
  });

  it("without an API URL, only allows the site itself", () => {
    expect(buildCsp()).toContain("connect-src 'self';");
  });

  it("is the same policy the nginx image writes at start-up", () => {
    const script = read("../../docker/40-runtime-config.sh");
    const policy = /policy="([^"]*)"/.exec(script)?.[1];
    expect(policy, "policy line in docker/40-runtime-config.sh").toBeTruthy();
    const nginx = policy!.replace("$connect", "'self' https://api.example.test");
    expect(buildCsp({ apiBaseUrl: "https://api.example.test/api/v1" })).toBe(nginx);
  });
});

describe("Netlify headers file", () => {
  const file = renderHeaders(buildCsp({ apiBaseUrl: "https://api.example.test/api/v1" }));

  it("carries the security headers and the CSP for every path", () => {
    const all = file.split("\n# Hashed")[0];
    expect(all).toMatch(/^\/\*$/m);
    expect(all).toContain("X-Content-Type-Options: nosniff");
    expect(all).toContain("X-Frame-Options: DENY");
    expect(all).toContain("Referrer-Policy: strict-origin-when-cross-origin");
    expect(all).toContain("Content-Security-Policy: default-src 'self'");
    expect(all).toContain("connect-src 'self' https://api.example.test;");
  });

  it("caches hashed assets for a year and never caches the entry point", () => {
    expect(file).toMatch(/\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
    expect(file).toMatch(/\/index\.html\n {2}Cache-Control: no-cache/);
    expect(file).toMatch(/\/config\.js\n {2}Cache-Control: no-cache/);
  });
});

describe("checkApiUrl (a production build must not ship a site that calls localhost)", () => {
  const prod = "production";
  it("accepts a real API URL", () => {
    expect(checkApiUrl({ apiBaseUrl: "https://api.example.test/api/v1", context: prod })).toBeNull();
  });
  it("fails a production build with no API URL", () => {
    expect(() => checkApiUrl({ apiBaseUrl: "", context: prod })).toThrow(/VITE_API_BASE_URL is not set/);
  });
  it.each(["http://localhost:8000/api/v1", "http://127.0.0.1:8000/api/v1"])(
    "fails a production build pointing at %s",
    (url) =>
      expect(() => checkApiUrl({ apiBaseUrl: url, context: prod })).toThrow(/only works on your own machine/),
  );
  it("only warns on previews and local builds", () => {
    expect(checkApiUrl({ apiBaseUrl: "", context: "deploy-preview" })).toMatch(/not set/);
    expect(checkApiUrl({ apiBaseUrl: "http://localhost:8000/api/v1", context: undefined })).toMatch(
      /own machine/,
    );
  });
  it("does not mistake a host that merely starts with 'localhost' for local", () => {
    expect(
      checkApiUrl({ apiBaseUrl: "https://localhost-api.example.test/api/v1", context: prod }),
    ).toBeNull();
  });
});

describe("single-page app fallback", () => {
  it("serves index.html for unknown paths", () => {
    expect(read("../../public/_redirects")).toMatch(/^\/\*\s+\/index\.html\s+200$/m);
  });
});
