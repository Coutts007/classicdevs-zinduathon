#!/bin/sh
# Writes /usr/share/nginx/html/config.js from the container's environment, so the same image can
# point at any API without a rebuild. Unset variables are left out (the build-time values apply).
set -eu
out=/usr/share/nginx/html/config.js
json=""
add() {
  # $1 key, $2 value; values are URLs, but escape backslashes and quotes anyway.
  [ -n "$2" ] || return 0
  value=$(printf '%s' "$2" | sed 's/\\/\\\\/g; s/"/\\"/g')
  json="${json:+$json,}\"$1\":\"$value\""
}
add apiBaseUrl "${API_BASE_URL:-}"
add appUrl "${APP_URL:-}"
add djangoAdminUrl "${DJANGO_ADMIN_URL:-}"
add apiDocsUrl "${API_DOCS_URL:-}"
printf 'window.__SKILLPROOF__ = {%s};\n' "$json" > "$out"
echo "runtime config: {$json}"

# Content-Security-Policy. connect-src must name the API's origin, which is only known here, so the
# header is written at start-up and included by security-headers.conf. The origin comes from
# API_BASE_URL, else the URL the image was built with (DEFAULT_API_BASE_URL); CSP_CONNECT_SRC adds
# extra space-separated origins. Anything that is not a plain URL character is dropped, so an odd
# value cannot inject directives or headers.
csp_file=/tmp/csp-header.conf
connect="'self'"
for url in "${API_BASE_URL:-${DEFAULT_API_BASE_URL:-}}" ${CSP_CONNECT_SRC:-}; do
  origin=$(printf '%s' "$url" | sed -nE 's#^(https?://[A-Za-z0-9._:-]+).*#\1#p')
  [ -n "$origin" ] && connect="$connect $origin"
done
policy="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src $connect; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
printf 'add_header Content-Security-Policy "%s" always;\n' "$policy" > "$csp_file"
echo "csp: $policy"
