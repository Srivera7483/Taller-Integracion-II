FROM node:24.21.0-bookworm-slim AS build

WORKDIR /app

RUN npm install --global pnpm@12.11.2

ENV CYPRESS_INSTALL_BINARY=0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL=http://localhost:3000/api/v1
ARG VITE_WS_URL=http://localhost:3000
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET

RUN pnpm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
