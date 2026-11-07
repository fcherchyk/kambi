# Dev image, same layout as mapa-mental's web Dockerfile: node_modules lives in its own volume
# (`web-node-modules`) and pnpm keeps a fixed store, so reinstalling on start is fast.
FROM node:22-alpine

RUN corepack enable

WORKDIR /app
ENV npm_config_store_dir=/pnpm-store CI=true

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5174
# Reinstall in case the lockfile changed since the volume was created, then serve.
CMD ["sh", "-c", "pnpm install --frozen-lockfile && pnpm dev"]
