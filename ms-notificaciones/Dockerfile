FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY nest-cli.json tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3004
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist

EXPOSE 3004
CMD ["node", "dist/main.js"]
