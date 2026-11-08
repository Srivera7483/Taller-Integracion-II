FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3004
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod

COPY src ./src

EXPOSE 3004
CMD ["node", "src/main.js"]
