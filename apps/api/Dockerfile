FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --filter @events-manager/api... --frozen-lockfile
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @events-manager/contracts build \
    && pnpm --filter @events-manager/api build \
    && pnpm --filter @events-manager/api deploy --prod --legacy /release \
    && rm -rf /release/src /release/test

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /release/ ./
USER node
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["node", "dist/index.js"]
