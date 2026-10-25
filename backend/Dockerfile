
FROM node:22-alpine AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force


FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

COPY --from=production-dependencies /app/node_modules ./node_modules

COPY package.json package-lock.json ./

COPY server.js ./server.js
COPY worker.js ./worker.js
COPY start.js ./start.js
COPY src ./src

USER node

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "start.js"]
