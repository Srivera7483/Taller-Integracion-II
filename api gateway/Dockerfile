FROM node:24.21.0-bookworm-slim

ENV NODE_ENV=production
ENV GATEWAY_PORT=3000

WORKDIR /app

RUN npm install --global pnpm@12.11.2

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --chown=node:node index.js rate-limit-store.js kill-switch.js redis-adapter.js ./

USER node

EXPOSE 3000

CMD ["node", "index.js"]
