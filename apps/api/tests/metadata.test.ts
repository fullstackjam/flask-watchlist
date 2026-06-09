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
  expect(body.results[1]?.posterUrl).toBeNull();
});
