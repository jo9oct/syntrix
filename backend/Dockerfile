# STATUS: UPDATED

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

USER node

EXPOSE 5000

CMD ["node", "server.js"]
