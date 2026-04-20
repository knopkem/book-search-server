# book-search-server

Browser-first replacement for the old Electron + sync workflow.

## What is in this repo

- `packages/server` — Fastify 5 + TypeScript API/server
- `packages/web` — React + Material UI web editor
- `book-search-ionic` — read-only mobile client with offline cache and native Google Sign-In

## Current architecture

### Server

- Fastify 5
- TypeScript
- SQLite
- Drizzle ORM + SQL migrations
- Google Sign-In token verification
- Secure cookie sessions for the web app
- Per-user mobile access tokens exchanged from native Google Sign-In

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
- CSV restore from legacy Electron backups
- Mobile Google Sign-In token exchange and revocation
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
| `SESSION_MAX_AGE_DAYS` | no | Browser session lifetime in days for persistent web login, default `30` |
| `ALLOWED_ORIGINS` | no | Comma-separated allowed browser/mobile origins |
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

## Mobile app

The Ionic app now:

- uses native Google Sign-In on Android
- exchanges the Google ID token at `POST /api/auth/google/mobile`
- syncs books via `GET /books` with the returned mobile bearer token
- revokes the mobile token at `POST /api/auth/mobile/logout`

For local mobile builds, copy `book-search-ionic/.env.example` to `book-search-ionic/.env` and set:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## CSV restore from the old Electron app

The browser app can restore books from a legacy `books.csv` backup created by `book-search-electron`.

Current behavior:

- upload happens from the **Books** page
- the server parses the CSV and validates it against the normal book rules
- rows are matched by exact `author + title` (`name + description`)
- when a match already exists, the current browser-stored row is kept unchanged
- only non-matching rows are imported

Expected CSV shape:

```text
name,description,remarks
Author Name,Book Title,Optional remarks
```

Security notes:

- uploads are authenticated and user-scoped
- the server treats the file as text only
- uploaded content is not executed, shelled out, or stored as a runnable file
- strict size, row-count, and schema validation are applied

## Docker deployment

Build and run:

```bash
docker compose up --build -d
```

The compose setup:

- persists SQLite data in `./packages/server/data`
- exposes port `3000`
- expects `.env` to be present

## Docker image publishing

GitHub Actions publishes the production image to:

```text
ghcr.io/knopkem/book-search-server
```

Published tags include:

- `latest` for the default branch
- branch names
- git tags such as `v1.2.3`
- commit SHA tags

## Production deployment on a VPS with shared Caddy

The repo includes a production-oriented books stack and a shared Caddy example for the host described in planning:

- `docker-compose.prod.yml` — books app container, no public port, Watchtower-enabled
- `deploy/docker-compose.caddy.yml` — shared Caddy reverse proxy
- `config/Caddyfile.shared` — routes `pacsnode.com` and `books.pacsnode.com`
- `deploy/books.env.example` — production app env template
- `deploy/caddy.env.example` — shared Caddy env template

### Intended topology

- Cloudflare proxies both domains
- Caddy is the only service exposing `80/443` on the VPS
- The existing main app and the books app both join the same external Docker network: `edge`
- Caddy routes:
  - `pacsnode.com` → existing app
  - `books.pacsnode.com` → books app

### Recommended rollout

1. Create the shared Docker network once:

   ```bash
   docker network create edge
   ```

2. Copy and fill the env files:

   ```bash
   cp deploy/books.env.example deploy/books.env
   cp deploy/caddy.env.example deploy/caddy.env
   ```

3. Update the existing main-domain app so its container is reachable on the `edge` network at the hostname used in `MAIN_UPSTREAM`.

4. Deploy the books app:

   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

5. Deploy shared Caddy:

   ```bash
   docker compose -f deploy/docker-compose.caddy.yml up -d
   ```

### Production values

For `deploy/books.env` set at least:

```env
GOOGLE_CLIENT_ID=...
SESSION_SECRET=...
SESSION_MAX_AGE_DAYS=30
ALLOWED_ORIGINS=https://books.pacsnode.com,http://localhost,https://localhost,capacitor://localhost
```

### Cloudflare and Google

Cloudflare:

- create `books.pacsnode.com` pointing to the VPS
- keep proxying enabled if desired
- use Full / Full (strict) TLS mode

Google OAuth client:

- add `https://books.pacsnode.com` to **Authorized JavaScript origins**

### Watchtower

Both the books app and the shared Caddy example include:

```text
com.centurylinklabs.watchtower.enable=true
```

so a host-level Watchtower instance can update them when newer images are published.

## nginx reverse proxy

An example config is provided at:

```text
config/nginx.book-search.conf
```

Use it behind TLS termination with Let's Encrypt or your preferred certificate flow.

## Notes

- The web app currently uses Google ID token verification from `@react-oauth/google`
- Android builds currently fail under Java 24; use JDK 23 or JDK 21 for `book-search-ionic/android` builds
- SQLite access now runs through `@libsql/client` with a local database file
