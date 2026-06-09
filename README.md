# Watchlist

A multi-tenant movie watchlist SaaS. Sign in with GitHub, track what you want to watch / are watching / have watched, with posters and metadata from OMDb.

Built on Cloudflare: a single Worker serves the React SPA (Static Assets) and the Hono API; data lives in D1.

## Stack
- Backend: Hono + Drizzle ORM + Cloudflare D1 (TypeScript)
- Auth: GitHub OAuth (arctic) + JWT cookie
- Metadata: OMDb API
- Frontend: React 19 + Vite + Tailwind v4 + shadcn/ui + TanStack Router/Query
- Monorepo: pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)

## Local development
1. `pnpm install`
2. Copy `apps/api/.dev.vars.example` → `apps/api/.dev.vars` and fill: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`, `OMDB_API_KEY`, `APP_URL=http://localhost:5173`.
3. Register a GitHub OAuth App with callback `http://localhost:5173/api/auth/github/callback`.
4. `pnpm --filter api exec wrangler d1 create watchlist` and put the returned `database_id` in `apps/api/wrangler.jsonc`.
5. `pnpm --filter api db:migrate:local`
6. `pnpm dev` → open http://localhost:5173

## Test
`pnpm test`

## Deploy (Cloudflare)
1. `pnpm --filter api db:migrate:remote`
2. Register a production GitHub OAuth App (callback `https://<your-worker-domain>/api/auth/github/callback`); set the four secrets via `wrangler secret put` and set `APP_URL` to your Worker domain.
3. `pnpm --filter api deploy` (builds the SPA, then `wrangler deploy`)
