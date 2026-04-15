FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/package.json
COPY packages/web/package.json packages/web/package.json

RUN npm ci

COPY . .

RUN npm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/package.json

RUN npm ci --omit=dev --workspace @book-search/server --include-workspace-root=false

COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/drizzle ./packages/server/drizzle
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY .env.example ./

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "@book-search/server"]
