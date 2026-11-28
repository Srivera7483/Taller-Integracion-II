FROM node:24.21.0-bookworm-slim AS base

WORKDIR /app

RUN npm install --global pnpm@12.11.2

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN pnpm run build

FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3004

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3004

CMD ["node", "dist/main.js"]
