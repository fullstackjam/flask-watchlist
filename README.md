# Watchlist

A multi-tenant movie watchlist SaaS. Sign in with GitHub and track what you
**want to watch**, are **watching**, or have **watched** — with posters,
overviews, genres, and ratings pulled from TMDB (Chinese titles supported).

Runs entirely on Cloudflare: a single Worker serves the React SPA (Static
Assets) *and* the Hono API, with data in D1.

## Features

- GitHub OAuth sign-in, per-user watchlists (multi-tenant)
- Three statuses: `want` → `watching` → `watched`
- Movie search & metadata from TMDB (`language=zh-CN`, Chinese-capable)
- Personal rating and notes per movie
- Posters, year, overview, genres, and external rating auto-filled on add

## Architecture

```
Browser ──► Cloudflare Worker ──┬─► /api/*  → Hono API ─► D1 (SQLite)
                                └─► /*      → React SPA (Static Assets)
```

One Worker handles everything: requests to `/api/*` hit the Hono app; all other
paths fall back to the SPA (`not_found_handling: single-page-application`).

## Stack

| Layer    | Tech                                                              |
| -------- | ---------------------------------------------------------------- |
| Backend  | Hono · Drizzle ORM · Cloudflare D1 (TypeScript)                  |
| Auth     | GitHub OAuth (arctic) + JWT cookie                               |
| Metadata | TMDB API                                                          |
| Frontend | React 19 · Vite · Tailwind v4 · shadcn/ui · TanStack Router/Query |
| Tooling  | pnpm workspaces · Biome · Vitest · Wrangler                      |

## Project layout

```
apps/
  api/             Hono API + Worker entry (serves SPA + API)
    src/routes/    auth, me, movies, metadata
    src/db/        Drizzle schema & client
    drizzle/       D1 migrations
  web/             React SPA
packages/
  shared/          Types & Zod schemas shared by api + web
```

## Local development

1. `pnpm install`
2. Copy `apps/api/.dev.vars.example` → `apps/api/.dev.vars` and fill:
   `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`, `TMDB_API_KEY`,
   `APP_URL=http://localhost:5173`.
3. Register a GitHub OAuth App with callback
   `http://localhost:5173/api/auth/github/callback`.
4. Create the D1 database and paste the returned `database_id` into
   `apps/api/wrangler.jsonc`:
   ```sh
   pnpm --filter api exec wrangler d1 create watchlist
   ```
5. `pnpm --filter api db:migrate:local`
6. `pnpm dev` → open http://localhost:5173

## Testing

```sh
pnpm test     # all workspaces (Vitest)
pnpm lint     # Biome
```

## Deploy (Cloudflare)

CI deploys automatically on push to `master` (see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml)): it runs tests, builds
the SPA, applies D1 migrations, syncs Worker secrets, and runs `wrangler deploy`.

To deploy manually:

1. Register a production GitHub OAuth App with callback
   `https://<your-worker-domain>/api/auth/github/callback`.
2. Set secrets (`GITHUB_CLIENT_ID` and `APP_URL` are non-secret vars in
   `wrangler.jsonc`):
   ```sh
   cd apps/api
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put JWT_SECRET
   wrangler secret put TMDB_API_KEY
   ```
3. `pnpm --filter api db:migrate:remote`
4. `pnpm --filter api deploy` (builds the SPA, then `wrangler deploy`)

## API

All routes are under `/api`. Movie routes require authentication.

| Method   | Path                    | Description                      |
| -------- | ----------------------- | -------------------------------- |
| `GET`    | `/auth/github`          | Start GitHub OAuth               |
| `GET`    | `/auth/github/callback` | OAuth callback (sets JWT cookie) |
| `POST`   | `/auth/logout`          | Clear session                    |
| `GET`    | `/me`                   | Current user (or `null`)         |
| `GET`    | `/movies`               | List movies (filter by `status`) |
| `POST`   | `/movies`               | Add a movie                      |
| `PATCH`  | `/movies/:id`           | Update status / rating / notes   |
| `DELETE` | `/movies/:id`           | Remove a movie                   |
| `GET`    | `/metadata/search?q=`   | Search TMDB                      |

## License

[MIT](LICENSE)
