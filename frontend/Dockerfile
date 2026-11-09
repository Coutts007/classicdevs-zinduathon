# syntax=docker/dockerfile:1
# Stage 1: build. Types are generated from the backend's committed openapi.yaml (copied in by the
# root compose build context, see docker-compose.yml).
FROM node:20-alpine AS deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS dev
# `vite --host` with the source mounted (docker compose --profile dev).
COPY frontend/ ./
COPY backend/openapi.yaml /app/backend/openapi.yaml
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]

FROM deps AS build
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ARG VITE_APP_URL=http://localhost:8080
ARG VITE_DJANGO_ADMIN_URL=http://localhost:8000/django-admin/
ARG VITE_API_DOCS_URL=http://localhost:8000/api/v1/docs/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_APP_URL=$VITE_APP_URL \
    VITE_DJANGO_ADMIN_URL=$VITE_DJANGO_ADMIN_URL VITE_API_DOCS_URL=$VITE_API_DOCS_URL
COPY frontend/ ./
COPY backend/openapi.yaml /app/backend/openapi.yaml
RUN npm run build

# Stage 2: static files on nginx, as a non-root user.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod
# nginx.conf is a template: ${PORT} is filled in at start (default 8080).
ENV PORT=8080
# The build-time API URL is the fallback origin for the CSP when API_BASE_URL is not set at runtime.
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ENV DEFAULT_API_BASE_URL=$VITE_API_BASE_URL
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template
COPY frontend/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build --chown=101:101 /app/frontend/dist /usr/share/nginx/html
# API_BASE_URL, APP_URL, DJANGO_ADMIN_URL, API_DOCS_URL at runtime → /config.js; also the CSP
# (CSP_CONNECT_SRC adds extra connect-src origins).
COPY --chmod=755 frontend/docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
EXPOSE 8080
