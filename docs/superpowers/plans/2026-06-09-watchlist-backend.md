# Watchlist Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Fast-moving APIs — verify with skills before coding:** This plan targets Cloudflare. Before writing wrangler config, D1 test setup, or OAuth code, consult the `wrangler`, `cloudflare`, and `workers-best-practices` skills for current exact syntax of: `wrangler.jsonc` (`assets` + `d1_databases` + `run_worker_first`), `@cloudflare/vitest-pool-workers` config, and `arctic` GitHub provider. The code below reflects the intended shape; reconcile any drift against the skills.

**Goal:** A fully tested Cloudflare Workers API (Hono + Drizzle + D1) providing GitHub OAuth auth and per-user (multi-tenant) movie CRUD with OMDb metadata proxy.

**Architecture:** A single Worker exposes `/api/*` via Hono. Auth is GitHub OAuth (arctic) issuing a JWT in an httpOnly cookie; no server-side session store. Data lives in D1 via Drizzle ORM; every data query is scoped by `user_id` for tenant isolation. The Worker also serves the SPA via Static Assets (wired in Plan 2). The Hono app exports its `AppType` for the frontend's typed RPC client.

**Tech Stack:** pnpm workspaces, TypeScript, Hono, `@hono/zod-validator` + Zod, Drizzle ORM (`drizzle-orm/d1`) + drizzle-kit, arctic (GitHub OAuth), `hono/jwt`, Vitest + `@cloudflare/vitest-pool-workers`, Biome.

**Credentials:** Already created and stored in `apps/api/.dev.vars` (gitignored): `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`, `OMDB_API_KEY`.

---

## File Structure

```
flask-watchlist/
├─ pnpm-workspace.yaml          # workspace globs
├─ package.json                 # root scripts (dev, build, test, lint)
├─ biome.json                   # lint + format
├─ tsconfig.base.json           # shared TS config
├─ packages/shared/
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ src/index.ts              # status enum + Zod schemas shared by api & web
└─ apps/api/
   ├─ package.json
   ├─ tsconfig.json
   ├─ wrangler.jsonc            # Worker name, D1 binding, assets binding
   ├─ drizzle.config.ts         # drizzle-kit config
   ├─ vitest.config.ts          # vitest-pool-workers config
   ├─ .dev.vars                 # secrets (exists, gitignored)
   ├─ .dev.vars.example         # template (committed)
   ├─ drizzle/                  # generated SQL migrations
   ├─ src/
   │  ├─ index.ts               # Worker fetch entry
   │  ├─ app.ts                 # Hono app assembly; exports AppType
   │  ├─ types.ts               # Env bindings + Hono Variables types
   │  ├─ db/
   │  │  ├─ schema.ts           # users, movies tables
   │  │  └─ client.ts           # drizzle(env.DB) factory
   │  ├─ lib/
   │  │  ├─ jwt.ts              # sign/verify session JWT
   │  │  ├─ github.ts           # arctic GitHub provider + fetch user
   │  │  └─ metadata.ts         # OMDb provider (search + lookup)
   │  ├─ middleware/
   │  │  └─ auth.ts             # requireAuth + optionalAuth
   │  └─ routes/
   │     ├─ auth.ts             # /auth/github, /callback, /logout
   │     ├─ me.ts               # /me
   │     ├─ movies.ts           # CRUD scoped by user_id
   │     └─ metadata.ts         # /metadata/search
   └─ tests/
      ├─ helpers.ts             # test DB seeding + auth cookie helper
      ├─ auth.test.ts
      ├─ movies.test.ts
      └─ metadata.test.ts
```

---

## Task 0: Monorepo scaffold + tooling

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `biome.json`, `tsconfig.base.json`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "watchlist",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently -n api,web -c blue,green \"pnpm --filter api dev\" \"pnpm --filter web dev\"",
    "build": "pnpm --filter web build",
    "test": "pnpm -r test",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "concurrently": "^9.1.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "files": { "ignore": ["dist", "drizzle", ".wrangler", "node_modules"] }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 5: Install root deps and commit**

Run: `pnpm install`
Expected: lockfile created, no errors.

```bash
git add pnpm-workspace.yaml package.json biome.json tsconfig.base.json pnpm-lock.yaml
git commit -m "chore: scaffold pnpm monorepo + tooling"
```

---

## Task 1: Shared package (status enum + Zod schemas)

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@watchlist/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "echo 'no tests' && exit 0" },
  "dependencies": { "zod": "^3.24.0" }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/shared/src/index.ts`**

```ts
import { z } from "zod";

export const WATCH_STATUSES = ["want", "watching", "watched"] as const;
export const watchStatusSchema = z.enum(WATCH_STATUSES);
export type WatchStatus = z.infer<typeof watchStatusSchema>;

// Payload for creating a movie in the user's list.
export const createMovieSchema = z.object({
  title: z.string().min(1).max(200),
  year: z.string().regex(/^\d{4}$/).optional(),
  imdbId: z.string().optional(),
  posterUrl: z.string().url().optional(),
  overview: z.string().optional(),
  genres: z.array(z.string()).optional(),
  externalRating: z.string().optional(),
  status: watchStatusSchema.default("want"),
});
export type CreateMovieInput = z.infer<typeof createMovieSchema>;

// Payload for updating a movie (all optional).
export const updateMovieSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  status: watchStatusSchema.optional(),
  userRating: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  watchedAt: z.string().datetime().nullable().optional(),
});
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;

export const movieListQuerySchema = z.object({
  status: watchStatusSchema.optional(),
  sort: z.enum(["created", "title", "year", "rating"]).default("created"),
});
```

- [ ] **Step 4: Install and commit**

Run: `pnpm install`
Expected: `@watchlist/shared` linked into workspace.

```bash
git add packages/shared pnpm-lock.yaml
git commit -m "feat(shared): status enum + movie zod schemas"
```

---

## Task 2: API package scaffold + wrangler.jsonc

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/wrangler.jsonc`, `apps/api/.dev.vars.example`, `apps/api/src/types.ts`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply watchlist --local",
    "db:migrate:remote": "wrangler d1 migrations apply watchlist --remote",
    "cf-typegen": "wrangler types"
  },
  "dependencies": {
    "@hono/zod-validator": "^0.4.1",
    "@watchlist/shared": "workspace:*",
    "arctic": "^3.1.0",
    "drizzle-orm": "^0.38.0",
    "hono": "^4.6.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "drizzle-kit": "^0.30.0",
    "vitest": "^2.1.0",
    "wrangler": "^3.95.0"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["@cloudflare/workers-types/2023-07-01", "vitest/globals"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  },
  "include": ["src", "tests", "worker-configuration.d.ts"]
}
```

- [ ] **Step 3: Create `apps/api/wrangler.jsonc`**

> Verify `assets` / `run_worker_first` syntax against the `wrangler` skill. The `assets.directory` points at the web build (produced in Plan 2); it is harmless before that dir exists for `wrangler dev` of the API alone, but if `wrangler dev` complains, comment out the `assets` block until Plan 2.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "watchlist",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "assets": {
    "directory": "../web/dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "watchlist",
      "database_id": "PLACEHOLDER_RUN_D1_CREATE",
      "migrations_dir": "drizzle"
    }
  ]
}
```

- [ ] **Step 4: Create `apps/api/.dev.vars.example`**

```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
JWT_SECRET=
OMDB_API_KEY=
APP_URL=http://localhost:5173
```

- [ ] **Step 5: Add `APP_URL` to existing `.dev.vars`**

Append to `apps/api/.dev.vars` (the secrets file already holds the other four):

```
APP_URL=http://localhost:5173
```

- [ ] **Step 6: Create `apps/api/src/types.ts`**

```ts
import type { User } from "./db/schema";

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  OMDB_API_KEY: string;
  APP_URL: string;
};

export type Variables = {
  user: User;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
```

- [ ] **Step 7: Install and commit**

Run: `pnpm install`
Expected: api deps resolved.

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/wrangler.jsonc apps/api/.dev.vars.example apps/api/src/types.ts pnpm-lock.yaml
git commit -m "chore(api): scaffold worker package + wrangler config"
```

---

## Task 3: Drizzle schema + migration

**Files:**
- Create: `apps/api/src/db/schema.ts`, `apps/api/src/db/client.ts`, `apps/api/drizzle.config.ts`

- [ ] **Step 1: Create `apps/api/src/db/schema.ts`**

```ts
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  githubId: integer("github_id").notNull().unique(),
  githubLogin: text("github_login").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const movies = sqliteTable("movies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  imdbId: text("imdb_id"),
  title: text("title").notNull(),
  year: text("year"),
  posterUrl: text("poster_url"),
  overview: text("overview"),
  genres: text("genres", { mode: "json" }).$type<string[]>(),
  externalRating: text("external_rating"),
  status: text("status", { enum: ["want", "watching", "watched"] }).notNull().default("want"),
  userRating: integer("user_rating"),
  notes: text("notes"),
  watchedAt: text("watched_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type Movie = typeof movies.$inferSelect;
```

- [ ] **Step 2: Create `apps/api/src/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const makeDb = (d1: D1Database) => drizzle(d1, { schema });
export type Db = ReturnType<typeof makeDb>;
```

- [ ] **Step 3: Create `apps/api/drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
```

- [ ] **Step 4: Generate migration**

Run: `pnpm --filter api db:generate`
Expected: a `drizzle/0000_*.sql` file created with `CREATE TABLE users` and `CREATE TABLE movies`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db apps/api/drizzle.config.ts apps/api/drizzle
git commit -m "feat(api): drizzle schema for users + movies, initial migration"
```

---

## Task 4: D1 test harness + smoke test

**Files:**
- Create: `apps/api/vitest.config.ts`, `apps/api/tests/helpers.ts`, `apps/api/tests/db.smoke.test.ts`

- [ ] **Step 1: Create `apps/api/vitest.config.ts`**

> Verify against the `cloudflare` skill (vitest-pool-workers). This config runs tests inside workerd with the same bindings as `wrangler.jsonc`, and applies D1 migrations from `./drizzle` before tests.

```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          compatibilityFlags: ["nodejs_compat"],
          bindings: {
            GITHUB_CLIENT_ID: "test-client-id",
            GITHUB_CLIENT_SECRET: "test-client-secret",
            JWT_SECRET: "test-jwt-secret-value-please",
            OMDB_API_KEY: "test-omdb-key",
            APP_URL: "http://localhost:5173",
          },
        },
      },
    },
  },
});
```

- [ ] **Step 2: Create `apps/api/tests/helpers.ts`**

> `applyMigrations` reads the generated SQL files and executes them against the test D1 instance. `env` comes from `cloudflare:test`.

```ts
import { env } from "cloudflare:test";
import { makeDb } from "../src/db/client";
import { users } from "../src/db/schema";

export const db = () => makeDb(env.DB as D1Database);

// Apply all generated migrations to the isolated per-test D1 database.
export async function applyMigrations() {
  const migrations = import.meta.glob("../drizzle/*.sql", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  for (const path of Object.keys(migrations).sort()) {
    const sql = migrations[path];
    for (const stmt of sql.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (trimmed) await (env.DB as D1Database).exec(trimmed.replace(/\n/g, " "));
    }
  }
}

export async function seedUser(overrides: Partial<{ githubId: number; githubLogin: string }> = {}) {
  const [user] = await db()
    .insert(users)
    .values({
      githubId: overrides.githubId ?? 1001,
      githubLogin: overrides.githubLogin ?? "alice",
      name: "Alice",
      avatarUrl: "https://example.com/a.png",
    })
    .returning();
  return user;
}
```

- [ ] **Step 3: Write the smoke test `apps/api/tests/db.smoke.test.ts`**

```ts
import { beforeEach, expect, it } from "vitest";
import { applyMigrations, db, seedUser } from "./helpers";
import { movies } from "../src/db/schema";

beforeEach(async () => {
  await applyMigrations();
});

it("inserts and reads a movie scoped to a user", async () => {
  const user = await seedUser();
  await db().insert(movies).values({ userId: user.id, title: "Inception", status: "want" });
  const rows = await db().select().from(movies);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.title).toBe("Inception");
  expect(rows[0]?.userId).toBe(user.id);
});
```

- [ ] **Step 4: Run the smoke test**

Run: `pnpm --filter api test`
Expected: PASS (1 test). If D1/migration wiring fails, fix per the `cloudflare` skill before continuing — every later task depends on this harness.

- [ ] **Step 5: Commit**

```bash
git add apps/api/vitest.config.ts apps/api/tests/helpers.ts apps/api/tests/db.smoke.test.ts
git commit -m "test(api): D1 vitest harness + smoke test"
```

---

## Task 5: Session JWT lib (TDD)

**Files:**
- Create: `apps/api/src/lib/jwt.ts`, `apps/api/tests/jwt.test.ts`

- [ ] **Step 1: Write the failing test `apps/api/tests/jwt.test.ts`**

```ts
import { expect, it } from "vitest";
import { signSession, verifySession } from "../src/lib/jwt";

const SECRET = "test-jwt-secret-value-please";

it("round-trips a session token", async () => {
  const token = await signSession({ userId: 42 }, SECRET);
  const payload = await verifySession(token, SECRET);
  expect(payload?.userId).toBe(42);
});

it("rejects a token signed with a different secret", async () => {
  const token = await signSession({ userId: 42 }, SECRET);
  const payload = await verifySession(token, "wrong-secret");
  expect(payload).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test jwt`
Expected: FAIL — cannot find module `../src/lib/jwt`.

- [ ] **Step 3: Implement `apps/api/src/lib/jwt.ts`**

```ts
import { sign, verify } from "hono/jwt";

export type SessionPayload = { userId: number };

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days
  return sign({ ...payload, exp }, secret);
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const payload = await verify(token, secret);
    if (typeof payload.userId !== "number") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter api test jwt`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/jwt.ts apps/api/tests/jwt.test.ts
git commit -m "feat(api): session JWT sign/verify"
```

---

## Task 6: requireAuth + optionalAuth middleware (TDD)

**Files:**
- Create: `apps/api/src/middleware/auth.ts`, `apps/api/tests/auth-middleware.test.ts`

The session cookie is named `session`. `requireAuth` reads it, verifies the JWT, loads the user, and stores it on `c.var.user` (401 if missing/invalid). `optionalAuth` does the same but never blocks.

- [ ] **Step 1: Write the failing test `apps/api/tests/auth-middleware.test.ts`**

```ts
import { Hono } from "hono";
import { beforeEach, expect, it } from "vitest";
import { requireAuth } from "../src/middleware/auth";
import { signSession } from "../src/lib/jwt";
import { applyMigrations, seedUser } from "./helpers";
import type { AppEnv } from "../src/types";

const SECRET = "test-jwt-secret-value-please";

function appWithGuard() {
  const app = new Hono<AppEnv>();
  app.use("*", requireAuth);
  app.get("/whoami", (c) => c.json({ login: c.var.user.githubLogin }));
  return app;
}

beforeEach(async () => {
  await applyMigrations();
});

it("rejects requests without a session cookie", async () => {
  const res = await appWithGuard().request("/whoami", {}, { JWT_SECRET: SECRET, DB: globalThis as never });
  expect(res.status).toBe(401);
});

it("allows a request with a valid session cookie", async () => {
  const user = await seedUser({ githubLogin: "bob" });
  const token = await signSession({ userId: user.id }, SECRET);
  const { env } = await import("cloudflare:test");
  const res = await appWithGuard().request(
    "/whoami",
    { headers: { Cookie: `session=${token}` } },
    env,
  );
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ login: "bob" });
});
```

> Note: `app.request(path, init, env)` injects bindings as the third arg. The first test passes a throwaway env; it should 401 before touching the DB.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test auth-middleware`
Expected: FAIL — cannot find `../src/middleware/auth`.

- [ ] **Step 3: Implement `apps/api/src/middleware/auth.ts`**

```ts
import { eq } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { makeDb } from "../db/client";
import { users } from "../db/schema";
import { verifySession } from "../lib/jwt";
import type { AppEnv } from "../types";

async function resolveUser(c: Parameters<Parameters<typeof createMiddleware<AppEnv>>[0]>[0]) {
  const token = getCookie(c, "session");
  if (!token) return null;
  const payload = await verifySession(token, c.env.JWT_SECRET);
  if (!payload) return null;
  const db = makeDb(c.env.DB);
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  return user ?? null;
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", user);
  await next();
});

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const user = await resolveUser(c);
  if (user) c.set("user", user);
  await next();
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter api test auth-middleware`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/middleware/auth.ts apps/api/tests/auth-middleware.test.ts
git commit -m "feat(api): requireAuth/optionalAuth middleware"
```

---

## Task 7: GitHub OAuth lib (arctic)

**Files:**
- Create: `apps/api/src/lib/github.ts`

> Verify the arctic GitHub API against the `cloudflare`/`workers-best-practices` skills (arctic v3: `new GitHub(clientId, clientSecret, redirectURI)`, `createAuthorizationURL(state, scopes)`, `validateAuthorizationCode(code)` returning tokens with `.accessToken()`).

- [ ] **Step 1: Implement `apps/api/src/lib/github.ts`**

```ts
import { GitHub } from "arctic";
import type { Bindings } from "../types";

export type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
};

export function makeGitHub(env: Bindings) {
  const redirectURI = `${env.APP_URL}/api/auth/github/callback`;
  return new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, redirectURI);
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "watchlist-app",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`);
  return (await res.json()) as GitHubUser;
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `pnpm --filter api exec tsc --noEmit`
Expected: no errors.

```bash
git add apps/api/src/lib/github.ts
git commit -m "feat(api): github oauth helper (arctic)"
```

---

## Task 8: Auth routes + /me (TDD)

**Files:**
- Create: `apps/api/src/routes/auth.ts`, `apps/api/src/routes/me.ts`, `apps/api/tests/auth.test.ts`

Routes: `GET /github` (302 to GitHub, sets `oauth_state` cookie), `GET /github/callback` (validates state, exchanges code, upserts user, sets `session` cookie, redirects to `APP_URL`), `POST /logout` (clears cookie). `/me` returns the current user or `null`.

- [ ] **Step 1: Write the failing test `apps/api/tests/auth.test.ts`**

```ts
import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";
import app from "../src/app";
import { db, applyMigrations, seedUser } from "./helpers";
import { users } from "../src/db/schema";
import { signSession } from "../src/lib/jwt";

beforeEach(async () => {
  await applyMigrations();
  vi.restoreAllMocks();
});

it("GET /api/auth/github redirects to GitHub with a state cookie", async () => {
  const res = await app.request("/api/auth/github", {}, env);
  expect(res.status).toBe(302);
  expect(res.headers.get("location")).toContain("github.com/login/oauth/authorize");
  expect(res.headers.get("set-cookie")).toContain("oauth_state=");
});

it("GET /api/me returns null when logged out", async () => {
  const res = await app.request("/api/me", {}, env);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ user: null });
});

it("GET /api/me returns the user when a valid session cookie is present", async () => {
  const user = await seedUser({ githubLogin: "carol" });
  const token = await signSession({ userId: user.id }, env.JWT_SECRET);
  const res = await app.request("/api/me", { headers: { Cookie: `session=${token}` } }, env);
  const body = (await res.json()) as { user: { githubLogin: string } | null };
  expect(body.user?.githubLogin).toBe("carol");
});

it("callback creates a new user on first login and sets a session cookie", async () => {
  // Mock arctic code exchange + GitHub user fetch.
  vi.spyOn(await import("../src/lib/github"), "fetchGitHubUser").mockResolvedValue({
    id: 7777,
    login: "newbie",
    name: "New Bie",
    avatar_url: "https://example.com/n.png",
  });
  vi.spyOn(await import("arctic").then((m) => m.GitHub.prototype), "validateAuthorizationCode")
    .mockResolvedValue({ accessToken: () => "fake-token" } as never);

  const res = await app.request(
    "/api/auth/github/callback?code=abc&state=xyz",
    { headers: { Cookie: "oauth_state=xyz" }, redirect: "manual" },
    env,
  );
  expect(res.status).toBe(302);
  expect(res.headers.get("set-cookie")).toContain("session=");

  const [created] = await db().select().from(users).where(eq(users.githubId, 7777));
  expect(created?.githubLogin).toBe("newbie");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test auth.test`
Expected: FAIL — cannot find `../src/app` (built next task) / routes missing.

> If executing strictly in order, this test imports `../src/app` which is created in Task 11. Either (a) implement Task 11's `app.ts` skeleton now mounting only auth+me, or (b) run this test after Task 11. Recommended: create the minimal `app.ts` in Step 3 below mounting auth + me, then expand it in Task 11.

- [ ] **Step 3: Implement `apps/api/src/routes/me.ts`**

```ts
import { Hono } from "hono";
import { optionalAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

const me = new Hono<AppEnv>();

me.get("/", optionalAuth, (c) => {
  const user = c.get("user");
  return c.json({ user: user ?? null });
});

export default me;
```

- [ ] **Step 4: Implement `apps/api/src/routes/auth.ts`**

```ts
import { generateState } from "arctic";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { makeDb } from "../db/client";
import { users } from "../db/schema";
import { fetchGitHubUser, makeGitHub } from "../lib/github";
import { signSession } from "../lib/jwt";
import type { AppEnv } from "../types";

const auth = new Hono<AppEnv>();

auth.get("/github", (c) => {
  const github = makeGitHub(c.env);
  const state = generateState();
  const url = github.createAuthorizationURL(state, ["read:user"]);
  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: c.env.APP_URL.startsWith("https"),
    path: "/",
    maxAge: 600,
    sameSite: "Lax",
  });
  return c.redirect(url.toString());
});

auth.get("/github/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "oauth_state");
  if (!code || !state || !storedState || state !== storedState) {
    return c.json({ error: "Invalid OAuth state" }, 400);
  }

  const github = makeGitHub(c.env);
  const tokens = await github.validateAuthorizationCode(code);
  const ghUser = await fetchGitHubUser(tokens.accessToken());

  const db = makeDb(c.env.DB);
  const [existing] = await db.select().from(users).where(eq(users.githubId, ghUser.id)).limit(1);
  let userId: number;
  if (existing) {
    await db
      .update(users)
      .set({ githubLogin: ghUser.login, name: ghUser.name, avatarUrl: ghUser.avatar_url })
      .where(eq(users.id, existing.id));
    userId = existing.id;
  } else {
    const [created] = await db
      .insert(users)
      .values({
        githubId: ghUser.id,
        githubLogin: ghUser.login,
        name: ghUser.name,
        avatarUrl: ghUser.avatar_url,
      })
      .returning();
    userId = created.id;
  }

  const token = await signSession({ userId }, c.env.JWT_SECRET);
  setCookie(c, "session", token, {
    httpOnly: true,
    secure: c.env.APP_URL.startsWith("https"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "Lax",
  });
  deleteCookie(c, "oauth_state", { path: "/" });
  return c.redirect(c.env.APP_URL);
});

auth.post("/logout", (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

export default auth;
```

- [ ] **Step 5: Create minimal `apps/api/src/app.ts` (expanded in Task 11)**

```ts
import { Hono } from "hono";
import auth from "./routes/auth";
import me from "./routes/me";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>().basePath("/api");

const routes = app.route("/auth", auth).route("/me", me);

export type AppType = typeof routes;
export default app;
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm --filter api test auth.test`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/auth.ts apps/api/src/routes/me.ts apps/api/src/app.ts apps/api/tests/auth.test.ts
git commit -m "feat(api): github oauth flow + /me"
```

---

## Task 9: Movies CRUD + tenant isolation (TDD)

**Files:**
- Create: `apps/api/src/routes/movies.ts`, `apps/api/tests/movies.test.ts`

All routes use `requireAuth`; every query filters by `c.var.user.id`. Cross-tenant access returns 404 (not 403, to avoid leaking existence).

- [ ] **Step 1: Write the failing test `apps/api/tests/movies.test.ts`**

```ts
import { env } from "cloudflare:test";
import { beforeEach, expect, it } from "vitest";
import app from "../src/app";
import { applyMigrations, seedUser } from "./helpers";
import { signSession } from "../src/lib/jwt";

async function cookieFor(userId: number) {
  return `session=${await signSession({ userId }, env.JWT_SECRET)}`;
}

beforeEach(async () => {
  await applyMigrations();
});

it("requires auth to list movies", async () => {
  const res = await app.request("/api/movies", {}, env);
  expect(res.status).toBe(401);
});

it("creates and lists a movie for the owner", async () => {
  const alice = await seedUser({ githubId: 1, githubLogin: "alice" });
  const headers = { Cookie: await cookieFor(alice.id), "Content-Type": "application/json" };

  const created = await app.request(
    "/api/movies",
    { method: "POST", headers, body: JSON.stringify({ title: "Dune", year: "2021", status: "want" }) },
    env,
  );
  expect(created.status).toBe(201);

  const list = await app.request("/api/movies", { headers: { Cookie: await cookieFor(alice.id) } }, env);
  const body = (await list.json()) as { movies: { title: string }[] };
  expect(body.movies).toHaveLength(1);
  expect(body.movies[0]?.title).toBe("Dune");
});

it("isolates movies between tenants", async () => {
  const alice = await seedUser({ githubId: 1, githubLogin: "alice" });
  const bob = await seedUser({ githubId: 2, githubLogin: "bob" });

  const created = await app.request(
    "/api/movies",
    {
      method: "POST",
      headers: { Cookie: await cookieFor(alice.id), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Alice Movie", status: "want" }),
    },
    env,
  );
  const { movie } = (await created.json()) as { movie: { id: number } };

  // Bob cannot see Alice's movie in his list.
  const bobList = await app.request("/api/movies", { headers: { Cookie: await cookieFor(bob.id) } }, env);
  expect(((await bobList.json()) as { movies: unknown[] }).movies).toHaveLength(0);

  // Bob cannot PATCH or DELETE Alice's movie -> 404.
  const patch = await app.request(
    `/api/movies/${movie.id}`,
    {
      method: "PATCH",
      headers: { Cookie: await cookieFor(bob.id), "Content-Type": "application/json" },
      body: JSON.stringify({ status: "watched" }),
    },
    env,
  );
  expect(patch.status).toBe(404);

  const del = await app.request(
    `/api/movies/${movie.id}`,
    { method: "DELETE", headers: { Cookie: await cookieFor(bob.id) } },
    env,
  );
  expect(del.status).toBe(404);
});

it("updates own movie fields", async () => {
  const alice = await seedUser({ githubId: 1, githubLogin: "alice" });
  const headers = { Cookie: await cookieFor(alice.id), "Content-Type": "application/json" };
  const created = await app.request(
    "/api/movies",
    { method: "POST", headers, body: JSON.stringify({ title: "Heat", status: "want" }) },
    env,
  );
  const { movie } = (await created.json()) as { movie: { id: number } };

  const res = await app.request(
    `/api/movies/${movie.id}`,
    { method: "PATCH", headers, body: JSON.stringify({ status: "watched", userRating: 9 }) },
    env,
  );
  expect(res.status).toBe(200);
  const { movie: updated } = (await res.json()) as { movie: { status: string; userRating: number } };
  expect(updated.status).toBe("watched");
  expect(updated.userRating).toBe(9);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test movies`
Expected: FAIL — `/api/movies` not mounted yet (404/no route).

- [ ] **Step 3: Implement `apps/api/src/routes/movies.ts`**

```ts
import { zValidator } from "@hono/zod-validator";
import { createMovieSchema, movieListQuerySchema, updateMovieSchema } from "@watchlist/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { makeDb } from "../db/client";
import { movies } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

const route = new Hono<AppEnv>();

route.use("*", requireAuth);

route.get("/", zValidator("query", movieListQuerySchema), async (c) => {
  const { status, sort } = c.req.valid("query");
  const db = makeDb(c.env.DB);
  const where = status
    ? and(eq(movies.userId, c.var.user.id), eq(movies.status, status))
    : eq(movies.userId, c.var.user.id);
  const orderBy =
    sort === "title"
      ? asc(movies.title)
      : sort === "year"
        ? desc(movies.year)
        : sort === "rating"
          ? desc(movies.userRating)
          : desc(movies.createdAt);
  const rows = await db.select().from(movies).where(where).orderBy(orderBy);
  return c.json({ movies: rows });
});

route.post("/", zValidator("json", createMovieSchema), async (c) => {
  const input = c.req.valid("json");
  const db = makeDb(c.env.DB);
  const [movie] = await db
    .insert(movies)
    .values({ ...input, userId: c.var.user.id })
    .returning();
  return c.json({ movie }, 201);
});

route.patch("/:id", zValidator("json", updateMovieSchema), async (c) => {
  const id = Number(c.req.param("id"));
  const input = c.req.valid("json");
  const db = makeDb(c.env.DB);
  const [movie] = await db
    .update(movies)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(eq(movies.id, id), eq(movies.userId, c.var.user.id)))
    .returning();
  if (!movie) return c.json({ error: "Not found" }, 404);
  return c.json({ movie });
});

route.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = makeDb(c.env.DB);
  const [deleted] = await db
    .delete(movies)
    .where(and(eq(movies.id, id), eq(movies.userId, c.var.user.id)))
    .returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

export default route;
```

- [ ] **Step 4: Mount movies in `app.ts`**

Modify `apps/api/src/app.ts` — add the import and chain `.route("/movies", movies)`:

```ts
import { Hono } from "hono";
import auth from "./routes/auth";
import me from "./routes/me";
import movies from "./routes/movies";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>().basePath("/api");

const routes = app.route("/auth", auth).route("/me", me).route("/movies", movies);

export type AppType = typeof routes;
export default app;
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter api test movies`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/movies.ts apps/api/src/app.ts apps/api/tests/movies.test.ts
git commit -m "feat(api): movies CRUD with tenant isolation"
```

---

## Task 10: OMDb metadata provider + route (TDD)

**Files:**
- Create: `apps/api/src/lib/metadata.ts`, `apps/api/src/routes/metadata.ts`, `apps/api/tests/metadata.test.ts`

The provider abstracts OMDb behind a `searchMetadata(query, key)` returning a normalized shape `{ imdbId, title, year, posterUrl }`. The route requires auth and proxies the query (hiding the key).

- [ ] **Step 1: Write the failing test `apps/api/tests/metadata.test.ts`**

```ts
import { env } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import app from "../src/app";
import { applyMigrations, seedUser } from "./helpers";
import { signSession } from "../src/lib/jwt";

beforeEach(async () => {
  await applyMigrations();
});
afterEach(() => vi.restoreAllMocks());

it("requires auth", async () => {
  const res = await app.request("/api/metadata/search?q=dune", {}, env);
  expect(res.status).toBe(401);
});

it("proxies OMDb search and normalizes results", async () => {
  const user = await seedUser();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        Search: [
          { Title: "Dune", Year: "2021", imdbID: "tt1160419", Poster: "https://img/dune.jpg" },
          { Title: "Dune", Year: "1984", imdbID: "tt0087182", Poster: "N/A" },
        ],
      }),
    ),
  );

  const res = await app.request(
    "/api/metadata/search?q=dune",
    { headers: { Cookie: `session=${await signSession({ userId: user.id }, env.JWT_SECRET)}` } },
    env,
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { results: { imdbId: string; title: string; posterUrl: string | null }[] };
  expect(body.results).toHaveLength(2);
  expect(body.results[0]).toEqual({
    imdbId: "tt1160419",
    title: "Dune",
    year: "2021",
    posterUrl: "https://img/dune.jpg",
  });
  expect(body.results[1]?.posterUrl).toBeNull(); // "N/A" normalized to null
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test metadata`
Expected: FAIL — route not mounted / module missing.

- [ ] **Step 3: Implement `apps/api/src/lib/metadata.ts`**

```ts
export type MetadataResult = {
  imdbId: string;
  title: string;
  year: string | null;
  posterUrl: string | null;
};

type OmdbSearchItem = { Title: string; Year: string; imdbID: string; Poster: string };
type OmdbSearchResponse = { Search?: OmdbSearchItem[]; Error?: string };

const clean = (v: string) => (v && v !== "N/A" ? v : null);

export async function searchMetadata(query: string, apiKey: string): Promise<MetadataResult[]> {
  const url = `https://www.omdbapi.com/?apikey=${apiKey}&type=movie&s=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OMDb request failed: ${res.status}`);
  const data = (await res.json()) as OmdbSearchResponse;
  if (!data.Search) return [];
  return data.Search.map((item) => ({
    imdbId: item.imdbID,
    title: item.Title,
    year: clean(item.Year),
    posterUrl: clean(item.Poster),
  }));
}
```

- [ ] **Step 4: Implement `apps/api/src/routes/metadata.ts`**

```ts
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { searchMetadata } from "../lib/metadata";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

const route = new Hono<AppEnv>();

route.use("*", requireAuth);

route.get("/search", zValidator("query", z.object({ q: z.string().min(1) })), async (c) => {
  const { q } = c.req.valid("query");
  const results = await searchMetadata(q, c.env.OMDB_API_KEY);
  return c.json({ results });
});

export default route;
```

- [ ] **Step 5: Mount metadata in `app.ts`**

Modify `apps/api/src/app.ts` to chain `.route("/metadata", metadata)`:

```ts
import { Hono } from "hono";
import auth from "./routes/auth";
import me from "./routes/me";
import metadata from "./routes/metadata";
import movies from "./routes/movies";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>().basePath("/api");

const routes = app
  .route("/auth", auth)
  .route("/me", me)
  .route("/movies", movies)
  .route("/metadata", metadata);

export type AppType = typeof routes;
export default app;
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm --filter api test metadata`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/metadata.ts apps/api/src/routes/metadata.ts apps/api/src/app.ts
git commit -m "feat(api): OMDb metadata search proxy"
```

---

## Task 11: Worker entry + error handling + full suite

**Files:**
- Create: `apps/api/src/index.ts`
- Modify: `apps/api/src/app.ts` (add CORS-free same-origin + onError)

- [ ] **Step 1: Add error handling to `apps/api/src/app.ts`**

Add `app.onError` before the export (keep the route chain unchanged):

```ts
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});
```

- [ ] **Step 2: Create `apps/api/src/index.ts`**

> Same-origin SPA + API: the Worker only runs for `/api/*` (via `run_worker_first` in wrangler.jsonc); all other paths are served by Static Assets. This entry simply delegates to the Hono app.

```ts
import app from "./app";
import type { Bindings } from "./types";

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
```

- [ ] **Step 3: Run the full test suite**

Run: `pnpm --filter api test`
Expected: PASS — all suites (db smoke, jwt, auth-middleware, auth, movies, metadata).

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter api exec tsc --noEmit`
Expected: no errors. (If `worker-configuration.d.ts` is referenced, run `pnpm --filter api cf-typegen` first.)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/app.ts
git commit -m "feat(api): worker entry + error handler"
```

---

## Task 12: Provision D1 + local end-to-end smoke

**Files:**
- Modify: `apps/api/wrangler.jsonc` (real `database_id`)

- [ ] **Step 1: Create the D1 database**

Run: `pnpm --filter api exec wrangler d1 create watchlist`
Expected: prints a `database_id`. Copy it into `wrangler.jsonc` `d1_databases[0].database_id`.

- [ ] **Step 2: Apply migrations locally**

Run: `pnpm --filter api db:migrate:local`
Expected: migration applied to local D1.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run: `pnpm --filter api dev` (starts `wrangler dev`, default `http://localhost:8787`).
In another terminal:
```bash
curl -s http://localhost:8787/api/me
```
Expected: `{"user":null}`.
```bash
curl -si "http://localhost:8787/api/auth/github" | grep -i location
```
Expected: a `location:` header pointing at `github.com/login/oauth/authorize`.

> Full OAuth round-trip is verified in Plan 2 once the SPA + browser flow exists. Stop `wrangler dev` after the smoke.

- [ ] **Step 4: Commit**

```bash
git add apps/api/wrangler.jsonc
git commit -m "chore(api): provision D1 database id"
```

---

## Backend Plan Self-Review

- **Spec coverage:** multi-tenant SaaS (Task 8 first-login auto-create, Task 9 tenant isolation) ✓; GitHub OAuth (Task 7-8) ✓; movies CRUD + status/rating/notes/watchedAt (Task 9, schema Task 3) ✓; OMDb provider (Task 10) ✓; D1 + Drizzle (Task 3-4) ✓; Workers entry + Static Assets routing (Task 11, wrangler Task 2) ✓; tests incl tenant isolation + auth callback (Task 4-10) ✓.
- **Deferred to Plan 2:** Static Assets actually serving the SPA build, README, `.dev.vars.example` already created here, deleting old Flask/Helm files.
- **Type consistency:** `AppEnv`/`Bindings`/`Variables` consistent across middleware, routes, app; `signSession`/`verifySession` signatures consistent; route response shapes (`{ user }`, `{ movies }`, `{ movie }`, `{ results }`) consistent between tests and handlers.
