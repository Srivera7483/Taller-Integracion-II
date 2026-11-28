FROM node:24.21.0-bookworm-slim AS base

WORKDIR /app

RUN apt-get update     && apt-get install -y --no-install-recommends openssl ca-certificates     && rm -rf /var/lib/apt/lists/*

RUN npm install --global pnpm@12.11.2

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma/schema.prisma ./prisma/schema.prisma

RUN pnpm install --frozen-lockfile

RUN pnpm exec prisma generate

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN pnpm run build


FROM base AS runtime

ENV NODE_ENV=production
ENV AUTH_PORT=3001

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 3001

CMD ["node", "dist/main.js"]
