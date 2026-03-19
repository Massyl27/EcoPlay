# ─────────────────────────────────────────────────────────────
#  EcoPlay – Dockerfile
#  Builds and serves the Expo Web (React Native Web) app.
# ─────────────────────────────────────────────────────────────

# ── Stage 1 : install deps & build ──────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (prod + dev needed to build)
RUN npm ci --legacy-peer-deps

# Copy the rest of the source
COPY . .

# Export static web build
RUN npx expo export --platform web

# ── Stage 2 : lightweight serve ─────────────────────────────
FROM nginx:alpine AS runner

# Copy the built web output
COPY --from=builder /app/dist /usr/share/nginx/html

# Use custom nginx config for proper SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
