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
