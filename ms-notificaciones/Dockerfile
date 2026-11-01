FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=3004
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile

COPY src ./src

EXPOSE 3004
CMD ["node", "src/main.js"]
