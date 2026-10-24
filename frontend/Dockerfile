# ============================================================
# Stage 1: Build production React Vite bundle
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with caching layer
COPY package*.json ./
RUN npm ci || npm install

# Copy application source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=http://localhost:3001/api/v1
ENV VITE_API_URL=${VITE_API_URL}

# Compile TypeScript and Vite production bundle into /app/dist
RUN npm run build

# ============================================================
# Stage 2: Production Nginx Server (Lightweight, Secure & Fast)
# ============================================================
FROM nginx:alpine AS production

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check to ensure Nginx is serving traffic
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
