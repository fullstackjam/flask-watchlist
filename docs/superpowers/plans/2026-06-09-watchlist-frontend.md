# Watchlist Frontend + Ship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisite:** Plan 1 (`2026-06-09-watchlist-backend.md`) is complete — the API exports `AppType` from `apps/api/src/app.ts` and all backend tests pass.
>
> **Fast-moving APIs — verify with skills before coding:** Consult current docs for Tailwind CSS v4 (`@tailwindcss/vite` plugin, `@import "tailwindcss"`), shadcn/ui init for Vite, and TanStack Router/Query setup. The code below reflects the intended shape; reconcile drift.

**Goal:** A React SPA (the watchlist UI) served by the same Worker via Static Assets, talking to the Plan 1 API with end-to-end types, deployable with one `wrangler deploy`.

**Architecture:** `apps/web` is a Vite + React 19 + TypeScript SPA using TanStack Router (routing) and TanStack Query (server state). It calls the API through Hono's typed `hc` client built from `AppType`. In dev, Vite proxies `/api` to `wrangler dev`. In production, `vite build` emits `apps/web/dist`, which the Worker serves via the `assets` binding (`run_worker_first: ["/api/*"]`), so `/api/*` hits Hono and everything else is the SPA.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Router, TanStack Query, Hono RPC client (`hono/client`), Vitest + Testing Library.

---

## File Structure

```
apps/web/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts            # react + tailwind plugins + /api proxy + path alias
├─ index.html
├─ components.json           # shadcn config
└─ src/
   ├─ main.tsx               # mount router + query provider
   ├─ index.css             # tailwind import + theme
   ├─ lib/
   │  ├─ api.ts              # hc<AppType> client
   │  └─ utils.ts            # cn() (shadcn)
   ├─ hooks/
   │  ├─ use-me.ts           # current user query
   │  ├─ use-movies.ts       # list/create/update/delete mutations
   │  └─ use-metadata.ts     # OMDb search query
   ├─ components/
   │  ├─ ui/                 # shadcn primitives (button, card, dialog, ...)
   │  ├─ top-bar.tsx
   │  ├─ movie-card.tsx
   │  ├─ add-movie-dialog.tsx
   │  └─ edit-movie-dialog.tsx
   └─ routes/
      ├─ __root.tsx          # layout (top bar + outlet)
      ├─ index.tsx           # landing (logged out) / watchlist (logged in)
      └─ router.tsx          # route tree
```

---

## Task 1: Web scaffold (Vite + React + TS)

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/src/main.tsx`, `apps/web/src/index.css`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/react-router": "^1.87.0",
    "@watchlist/shared": "workspace:*",
    "hono": "^4.6.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "noEmit": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Watchlist</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `apps/web/vite.config.ts`**

```ts
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.ts"] },
});
```

- [ ] **Step 5: Create `apps/web/src/index.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 6: Create `apps/web/src/test-setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 7: Create placeholder `apps/web/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="p-8 text-2xl font-bold">Watchlist</div>
  </StrictMode>,
);
```

- [ ] **Step 8: Install, verify dev build, commit**

Run: `pnpm install`
Run: `pnpm --filter web build`
Expected: `apps/web/dist/index.html` produced, no errors.

```bash
git add apps/web pnpm-lock.yaml
git commit -m "chore(web): scaffold vite + react + tailwind"
```

---

## Task 2: shadcn/ui + cn util

**Files:**
- Create: `apps/web/components.json`, `apps/web/src/lib/utils.ts`, `apps/web/src/components/ui/*`

> Verify shadcn init/add commands with current docs. Commands below are the expected flow.

- [ ] **Step 1: Initialize shadcn**

Run (from `apps/web`): `pnpm dlx shadcn@latest init`
Choose: base color Neutral, CSS variables yes. This writes `components.json` and updates `index.css` with theme variables.

- [ ] **Step 2: Add the primitives this app uses**

Run (from `apps/web`): `pnpm dlx shadcn@latest add button card dialog input select textarea badge tabs avatar sonner`
Expected: files created under `src/components/ui/` and `src/lib/utils.ts` (with `cn`).

- [ ] **Step 3: Verify build and commit**

Run: `pnpm --filter web build`
Expected: builds clean.

```bash
git add apps/web/components.json apps/web/src/components/ui apps/web/src/lib/utils.ts apps/web/src/index.css
git commit -m "chore(web): shadcn/ui primitives"
```

---

## Task 3: Typed API client

**Files:**
- Create: `apps/web/src/lib/api.ts`

The client uses Hono's `hc` with the backend's `AppType`. `credentials: "include"` sends the session cookie. Since web and api are same-origin in prod and proxied in dev, the base URL is empty (relative).

- [ ] **Step 1: Create `apps/web/src/lib/api.ts`**

```ts
import { hc } from "hono/client";
import type { AppType } from "../../../api/src/app";

export const api = hc<AppType>("/", {
  init: { credentials: "include" },
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors (resolves `AppType` across packages).

> If TS cannot resolve the cross-package import, add `"references"` to `apps/web/tsconfig.json` pointing at `../api`, or import the type via a path alias. Reconcile with project TS setup.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/tsconfig.json
git commit -m "feat(web): typed hono rpc client"
```

---

## Task 4: Query provider + auth hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/use-me.ts`, `apps/web/src/hooks/use-me.test.tsx`, `apps/web/src/lib/query.tsx`

- [ ] **Step 1: Create `apps/web/src/lib/query.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 2: Write the failing test `apps/web/src/hooks/use-me.test.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useMe } from "./use-me";

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it("returns the user from /api/me", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ user: { id: 1, githubLogin: "alice", name: "Alice", avatarUrl: "" } })),
  );
  const { result } = renderHook(() => useMe(), { wrapper });
  await waitFor(() => expect(result.current.data?.githubLogin).toBe("alice"));
});

it("returns null when logged out", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ user: null })));
  const { result } = renderHook(() => useMe(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter web test use-me`
Expected: FAIL — `./use-me` missing.

- [ ] **Step 4: Implement `apps/web/src/hooks/use-me.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.api.me.$get();
      const { user } = await res.json();
      return user;
    },
  });
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter web test use-me`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/use-me.ts apps/web/src/hooks/use-me.test.tsx apps/web/src/lib/query.tsx
git commit -m "feat(web): query provider + useMe hook"
```

---

## Task 5: Movies + metadata hooks (TDD)

**Files:**
- Create: `apps/web/src/hooks/use-movies.ts`, `apps/web/src/hooks/use-metadata.ts`, `apps/web/src/hooks/use-movies.test.tsx`

- [ ] **Step 1: Write the failing test `apps/web/src/hooks/use-movies.test.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useMovies } from "./use-movies";

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it("lists movies", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ movies: [{ id: 1, title: "Dune", status: "want" }] })),
  );
  const { result } = renderHook(() => useMovies(), { wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(1));
  expect(result.current.data?.[0]?.title).toBe("Dune");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test use-movies`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `apps/web/src/hooks/use-movies.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMovieInput, UpdateMovieInput, WatchStatus } from "@watchlist/shared";
import { api } from "../lib/api";

export function useMovies(status?: WatchStatus) {
  return useQuery({
    queryKey: ["movies", status ?? "all"],
    queryFn: async () => {
      const res = await api.api.movies.$get({ query: status ? { status } : {} });
      const { movies } = await res.json();
      return movies;
    },
  });
}

export function useCreateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMovieInput) => {
      const res = await api.api.movies.$post({ json: input });
      if (!res.ok) throw new Error("create failed");
      return (await res.json()).movie;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movies"] }),
  });
}

export function useUpdateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateMovieInput }) => {
      const res = await api.api.movies[":id"].$patch({ param: { id: String(id) }, json: input });
      if (!res.ok) throw new Error("update failed");
      return (await res.json()).movie;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movies"] }),
  });
}

export function useDeleteMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.api.movies[":id"].$delete({ param: { id: String(id) } });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movies"] }),
  });
}
```

- [ ] **Step 4: Implement `apps/web/src/hooks/use-metadata.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useMetadataSearch(query: string) {
  return useQuery({
    queryKey: ["metadata", query],
    enabled: query.trim().length > 0,
    queryFn: async () => {
      const res = await api.api.metadata.search.$get({ query: { q: query } });
      const { results } = await res.json();
      return results;
    },
  });
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter web test use-movies`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/use-movies.ts apps/web/src/hooks/use-metadata.ts apps/web/src/hooks/use-movies.test.tsx
git commit -m "feat(web): movies + metadata query/mutation hooks"
```

---

## Task 6: Top bar + login/logout

**Files:**
- Create: `apps/web/src/components/top-bar.tsx`

- [ ] **Step 1: Create `apps/web/src/components/top-bar.tsx`**

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMe } from "@/hooks/use-me";

export function TopBar() {
  const { data: user } = useMe();
  const qc = useQueryClient();

  async function logout() {
    await api.api.auth.logout.$post();
    await qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <a href="/" className="text-lg font-semibold">🎬 Watchlist</a>
      {user ? (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.githubLogin} />
            <AvatarFallback>{user.githubLogin.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
        </div>
      ) : (
        <Button asChild size="sm">
          <a href="/api/auth/github">Sign in with GitHub</a>
        </Button>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

```bash
git add apps/web/src/components/top-bar.tsx
git commit -m "feat(web): top bar with github login/logout"
```

---

## Task 7: Movie card + edit dialog

**Files:**
- Create: `apps/web/src/components/movie-card.tsx`, `apps/web/src/components/edit-movie-dialog.tsx`

- [ ] **Step 1: Create `apps/web/src/components/movie-card.tsx`**

```tsx
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { WatchStatus } from "@watchlist/shared";
import { EditMovieDialog } from "./edit-movie-dialog";

type Movie = {
  id: number;
  title: string;
  year: string | null;
  posterUrl: string | null;
  status: WatchStatus;
  userRating: number | null;
  notes: string | null;
  watchedAt: string | null;
};

const STATUS_LABEL: Record<WatchStatus, string> = {
  want: "想看",
  watching: "在看",
  watched: "看完",
};

export function MovieCard({ movie }: { movie: Movie }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="cursor-pointer overflow-hidden" onClick={() => setOpen(true)}>
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} className="aspect-[2/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[2/3] items-center justify-center bg-muted text-muted-foreground">
            No poster
          </div>
        )}
        <div className="space-y-1 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-medium">{movie.title}</h3>
            <Badge variant="secondary">{STATUS_LABEL[movie.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {movie.year ?? "—"}
            {movie.userRating ? ` · ★ ${movie.userRating}/10` : ""}
          </p>
        </div>
      </Card>
      <EditMovieDialog movie={movie} open={open} onOpenChange={setOpen} />
    </>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/edit-movie-dialog.tsx`**

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WATCH_STATUSES, type WatchStatus } from "@watchlist/shared";
import { useDeleteMovie, useUpdateMovie } from "@/hooks/use-movies";

type Movie = {
  id: number;
  title: string;
  status: WatchStatus;
  userRating: number | null;
  notes: string | null;
};

const STATUS_LABEL: Record<WatchStatus, string> = { want: "想看", watching: "在看", watched: "看完" };

export function EditMovieDialog({
  movie,
  open,
  onOpenChange,
}: {
  movie: Movie;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const update = useUpdateMovie();
  const remove = useDeleteMovie();
  const [status, setStatus] = useState<WatchStatus>(movie.status);
  const [rating, setRating] = useState(movie.userRating?.toString() ?? "");
  const [notes, setNotes] = useState(movie.notes ?? "");

  async function save() {
    await update.mutateAsync({
      id: movie.id,
      input: {
        status,
        userRating: rating ? Number(rating) : null,
        notes: notes || null,
        watchedAt: status === "watched" ? new Date().toISOString() : null,
      },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{movie.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={status} onValueChange={(v) => setStatus(v as WatchStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WATCH_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={10}
            placeholder="评分 1-10"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
          <Textarea placeholder="笔记" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter className="justify-between">
          <Button variant="destructive" onClick={() => remove.mutate(movie.id, { onSuccess: () => onOpenChange(false) })}>
            删除
          </Button>
          <Button onClick={save} disabled={update.isPending}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

```bash
git add apps/web/src/components/movie-card.tsx apps/web/src/components/edit-movie-dialog.tsx
git commit -m "feat(web): movie card + edit dialog"
```

---

## Task 8: Add-movie dialog (OMDb search)

**Files:**
- Create: `apps/web/src/components/add-movie-dialog.tsx`

- [ ] **Step 1: Create `apps/web/src/components/add-movie-dialog.tsx`**

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateMovie } from "@/hooks/use-movies";
import { useMetadataSearch } from "@/hooks/use-metadata";

export function AddMovieDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: results, isFetching } = useMetadataSearch(query);
  const create = useCreateMovie();

  async function add(r: { imdbId: string; title: string; year: string | null; posterUrl: string | null }) {
    await create.mutateAsync({
      imdbId: r.imdbId,
      title: r.title,
      year: r.year ?? undefined,
      posterUrl: r.posterUrl ?? undefined,
      status: "want",
    });
    setOpen(false);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>添加</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>搜索影片</DialogTitle>
        </DialogHeader>
        <Input placeholder="输入片名…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isFetching && <p className="text-sm text-muted-foreground">搜索中…</p>}
          {results?.map((r) => (
            <button
              key={r.imdbId}
              type="button"
              className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
              onClick={() => add(r)}
            >
              {r.posterUrl ? (
                <img src={r.posterUrl} alt={r.title} className="h-16 w-11 rounded object-cover" />
              ) : (
                <div className="h-16 w-11 rounded bg-muted" />
              )}
              <span>
                <span className="font-medium">{r.title}</span>
                <span className="block text-sm text-muted-foreground">{r.year ?? "—"}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

```bash
git add apps/web/src/components/add-movie-dialog.tsx
git commit -m "feat(web): add-movie dialog with OMDb search"
```

---

## Task 9: Routes — landing + watchlist

**Files:**
- Create: `apps/web/src/routes/__root.tsx`, `apps/web/src/routes/index.tsx`, `apps/web/src/routes/router.tsx`
- Modify: `apps/web/src/main.tsx`

> Using TanStack Router's code-based route tree (no file-based plugin) to keep wiring explicit.

- [ ] **Step 1: Create `apps/web/src/routes/__root.tsx`**

```tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/top-bar";

export const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  ),
});
```

- [ ] **Step 2: Create `apps/web/src/routes/index.tsx`**

```tsx
import { createRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AddMovieDialog } from "@/components/add-movie-dialog";
import { MovieCard } from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WATCH_STATUSES, type WatchStatus } from "@watchlist/shared";
import { useMe } from "@/hooks/use-me";
import { useMovies } from "@/hooks/use-movies";
import { rootRoute } from "./__root";

const STATUS_LABEL: Record<WatchStatus, string> = { want: "想看", watching: "在看", watched: "看完" };

function Home() {
  const { data: user, isLoading } = useMe();
  const [tab, setTab] = useState<WatchStatus | "all">("all");
  const { data: movies } = useMovies(tab === "all" ? undefined : tab);

  if (isLoading) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-bold">你的影视清单</h1>
        <p className="text-muted-foreground">登录后管理你的「想看 / 在看 / 看完」。</p>
        <Button asChild size="lg">
          <a href="/api/auth/github">Sign in with GitHub</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as WatchStatus | "all")}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            {WATCH_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>{STATUS_LABEL[s]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <AddMovieDialog />
      </div>
      {movies && movies.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-muted-foreground">还没有影片，点「添加」开始吧。</p>
      )}
    </div>
  );
}

export const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Home });
```

- [ ] **Step 3: Create `apps/web/src/routes/router.tsx`**

```tsx
import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { indexRoute } from "./index";

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

- [ ] **Step 4: Update `apps/web/src/main.tsx`**

```tsx
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryProvider } from "./lib/query";
import { router } from "./routes/router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </StrictMode>,
);
```

- [ ] **Step 5: Build + typecheck**

Run: `pnpm --filter web build`
Expected: builds clean, `apps/web/dist` produced.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes apps/web/src/main.tsx
git commit -m "feat(web): landing + watchlist routes"
```

---

## Task 10: End-to-end dev verification

No new files. Verify the whole stack runs locally.

- [ ] **Step 1: Start both servers**

Run (repo root): `pnpm dev`
Expected: `wrangler dev` on `:8787` and Vite on `:5173` both start.

- [ ] **Step 2: Verify GitHub OAuth callback URL matches**

Confirm the GitHub OAuth App's callback is `http://localhost:5173/api/auth/github/callback` and `apps/api/.dev.vars` has `APP_URL=http://localhost:5173`. The login link points at `/api/auth/github`, proxied by Vite to the Worker.

- [ ] **Step 3: Manual flow in browser**

Open `http://localhost:5173`:
1. See the landing page → click "Sign in with GitHub" → authorize → redirected back logged in.
2. Click "添加" → search a movie (e.g. "dune") → pick one → it appears in the grid.
3. Click the card → change status to 看完, set rating, save → card updates.
4. Switch tabs (想看/在看/看完) → filtering works.
5. Click "Sign out" → back to landing page.

Expected: all steps work. If OAuth fails, check `.dev.vars` secrets and callback URL. If `/api` 404s, confirm Vite proxy + `wrangler dev` port.

- [ ] **Step 4: Run all tests**

Run (repo root): `pnpm test`
Expected: api + web suites pass.

> No commit (verification only). Fix any failures before proceeding.

---

## Task 11: Production assets wiring + deploy

**Files:**
- Modify: `apps/api/package.json` (build assets before deploy), root `package.json` if needed

The Worker's `wrangler.jsonc` already declares `assets.directory: "../web/dist"` and `run_worker_first: ["/api/*"]` (Plan 1, Task 2). Deploy must build the web app first.

- [ ] **Step 1: Add a deploy script that builds web first**

Modify `apps/api/package.json` `scripts.deploy`:

```json
"deploy": "pnpm --filter web build && wrangler deploy"
```

- [ ] **Step 2: Verify the assets routing locally against the build**

Run: `pnpm --filter web build`
Run: `pnpm --filter api dev`
Open `http://localhost:8787/` (the Worker serving built assets directly).
Expected: SPA loads; `http://localhost:8787/api/me` returns JSON. A deep link like `http://localhost:8787/anything` returns the SPA (`index.html`) via SPA fallback.

> If `/api/*` returns the SPA instead of JSON (or vice versa), fix `run_worker_first`/`assets` config per the `wrangler` skill before deploying.

- [ ] **Step 3: Create the remote D1 + apply migrations**

Run: `pnpm --filter api db:migrate:remote`
Expected: migrations applied to the remote D1 created in Plan 1 Task 12.

- [ ] **Step 4: Push production secrets**

For production you need a SECOND GitHub OAuth App whose callback is `https://<your-worker-domain>/api/auth/github/callback`, and `APP_URL` set to that origin. Run from `apps/api`:

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put OMDB_API_KEY
```

Set `APP_URL` as a non-secret var in `wrangler.jsonc` (`"vars": { "APP_URL": "https://<your-worker-domain>" }`) or as a secret.

- [ ] **Step 5: Deploy**

Run: `pnpm --filter api deploy`
Expected: `wrangler deploy` uploads the Worker + assets, prints the live URL.

- [ ] **Step 6: Smoke the deployed app**

Open the printed URL, repeat Task 10 Step 3 against production (using the production GitHub OAuth App).

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/wrangler.jsonc
git commit -m "chore: production assets wiring + deploy script"
```

---

## Task 12: Docs + remove legacy Flask/Helm

**Files:**
- Modify: `README.md`
- Delete: `watchlist/`, `Dockerfile`, `requirements.txt`, `.flaskenv`, `helm/`, `.github/workflows/docker.yml`, `.devcontainer/devcontainer.json` (if Python-specific)

- [ ] **Step 1: Rewrite `README.md`**

```markdown
# Watchlist

A multi-tenant movie watchlist SaaS. Sign in with GitHub, track what you want to watch / are watching / have watched, with posters and metadata from OMDb.

Built on Cloudflare: a single Worker serves the React SPA (Static Assets) and the Hono API; data in D1.

## Stack
- Backend: Hono + Drizzle ORM + Cloudflare D1 (TypeScript)
- Auth: GitHub OAuth (arctic) + JWT cookie
- Metadata: OMDb API
- Frontend: React 19 + Vite + Tailwind v4 + shadcn/ui + TanStack Router/Query
- Monorepo: pnpm workspaces

## Local development
1. `pnpm install`
2. Copy `apps/api/.dev.vars.example` → `apps/api/.dev.vars` and fill: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`, `OMDB_API_KEY`, `APP_URL=http://localhost:5173`.
3. Register a GitHub OAuth App with callback `http://localhost:5173/api/auth/github/callback`.
4. `pnpm --filter api exec wrangler d1 create watchlist` and put the id in `apps/api/wrangler.jsonc`.
5. `pnpm --filter api db:migrate:local`
6. `pnpm dev` → open http://localhost:5173

## Test
`pnpm test`

## Deploy (Cloudflare)
1. `pnpm --filter api db:migrate:remote`
2. Register a production GitHub OAuth App; set `wrangler secret put` for the four secrets and `APP_URL` to your Worker domain.
3. `pnpm --filter api deploy`
```

- [ ] **Step 2: Delete legacy files**

```bash
git rm -r watchlist Dockerfile requirements.txt .flaskenv helm .github/workflows/docker.yml
```

> Review `.devcontainer/devcontainer.json` — delete only if it is Python/Flask-specific. Mention rather than assume.

- [ ] **Step 3: Verify nothing references removed files**

Run: `pnpm test && pnpm --filter web build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README; remove legacy Flask/Helm"
```

---

## Frontend Plan Self-Review

- **Spec coverage:** landing page for logged-out + watchlist for logged-in (Task 9) ✓; GitHub login/logout UI (Task 6) ✓; add flow via OMDb search (Task 8) ✓; status tabs/filter (Task 9) ✓; edit status/rating/notes/watchedAt (Task 7) ✓; typed RPC client (Task 3) ✓; same-Worker Static Assets single deploy (Task 11) ✓; README + legacy removal (Task 12) ✓.
- **Placeholder scan:** no TBD/TODO; every code step shows full code; scaffolding steps give exact commands.
- **Type consistency:** `WatchStatus`/`WATCH_STATUSES`/`STATUS_LABEL` consistent across card, dialogs, routes; hook names (`useMe`, `useMovies`, `useCreateMovie`, `useUpdateMovie`, `useDeleteMovie`, `useMetadataSearch`) consistent between definitions and consumers; API client path access (`api.api.movies.$get`, `api.api.movies[":id"].$patch`, `api.api.metadata.search.$get`, `api.api.auth.logout.$post`, `api.api.me.$get`) matches the route mounting in Plan 1 `app.ts` (`basePath("/api")` + `/auth`, `/me`, `/movies`, `/metadata`).
- **Cross-plan dependency:** `AppType` import in Task 3 requires Plan 1 complete. Hook response shapes (`{ user }`, `{ movies }`, `{ movie }`, `{ results }`) match Plan 1 handlers.
```
