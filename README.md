# book-search-server

Browser-first replacement for the old Electron + sync workflow.

## What is in this repo

- `packages/server` — Fastify 5 + TypeScript API/server
- `packages/web` — React + Material UI web editor
- `book-search-ionic` — existing read-only mobile client, still supported via API tokens

## Current architecture

### Server

- Fastify 5
- TypeScript
- SQLite
- Drizzle ORM + SQL migrations
- Google Sign-In token verification
- Secure cookie sessions for the web app
- Per-user API tokens for the Ionic mobile app

### Web app

- React
- Vite
- Material UI
- MUI DataGrid

## Data model

Each authenticated Google user has their own book collection.

```ts
Book {
  id: string;
  name: string;        // author
  description: string; // title
  remarks: string;
}
```

## Features implemented

- Multi-tenant user storage
- Google Sign-In for the browser app
- Secure session-based auth
- Book CRUD API
- Browser-based editing UI
- Search/filtering in the grid
- Mobile API token generation and revocation
- Legacy `/books` endpoint compatibility for the Ionic client
- SQLite migrations on startup
- Rate limiting, Helmet, CORS, structured logging

## Environment

Copy `.env.example` to `.env` and set real values.

| Variable | Required | Description |
| --- | --- | --- |
| `HOST` | no | Bind address, default `0.0.0.0` |
| `PORT` | no | HTTP port, default `3000` |
| `DATABASE_PATH` | no | SQLite database file path |
| `GOOGLE_CLIENT_ID` | yes | Google OAuth client ID for browser sign-in |
| `SESSION_SECRET` | yes | Long random string used to derive the session encryption key |
| `ALLOWED_ORIGINS` | no | Comma-separated allowed browser origins |
| `RATE_LIMIT_MAX` | no | Max requests per time window |
| `RATE_LIMIT_WINDOW` | no | Fastify rate-limit window |
| `LOG_LEVEL` | no | Fastify/Pino log level |

## Development

Install dependencies:

```bash
npm install
```

Run the backend:

```bash
npm run dev:server
```

Run the web app:

```bash
npm run dev:web
```

Run all checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Production build

```bash
npm run build
npm run start -w @book-search/server
```

The Fastify server serves the built web app from `packages/web/dist`.

## API documentation

Generated API docs are available at:

```text
/api/docs
```

## Mobile app compatibility

The Ionic app is still expected to call:

- `GET /books`

with:

- `Authorization: Bearer <api-token>`

Generate that token in the browser app under **Settings**.

## Docker deployment

Build and run:

```bash
docker compose up --build -d
```

The compose setup:

- persists SQLite data in `./packages/server/data`
- exposes port `3000`
- expects `.env` to be present

## nginx reverse proxy

An example config is provided at:

```text
config/nginx.book-search.conf
```

Use it behind TLS termination with Let's Encrypt or your preferred certificate flow.

## Notes

- The web app currently uses Google ID token verification from `@react-oauth/google`
- The mobile app migration to Google Sign-In is intentionally not part of this repo change
- SQLite access now runs through `@libsql/client` with a local database file
