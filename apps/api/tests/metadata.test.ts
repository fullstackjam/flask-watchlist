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

it("proxies TMDB search (incl. Chinese) and normalizes results", async () => {
  const user = await seedUser();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        results: [
          { id: 27205, title: "盗梦空间", release_date: "2010-07-15", poster_path: "/abc.jpg" },
          { id: 999, title: "No Poster", release_date: "", poster_path: null },
        ],
      }),
    ),
  );

  const res = await app.request(
    "/api/metadata/search?q=盗梦空间",
    { headers: { Cookie: `session=${await signSession({ userId: user.id }, env.JWT_SECRET)}` } },
    env,
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    results: { imdbId: string; title: string; year: string | null; posterUrl: string | null }[];
  };
  expect(body.results).toHaveLength(2);
  expect(body.results[0]).toEqual({
    imdbId: "27205",
    title: "盗梦空间",
    year: "2010",
    posterUrl: "https://image.tmdb.org/t/p/w342/abc.jpg",
  });
  expect(body.results[1]?.posterUrl).toBeNull();
  expect(body.results[1]?.year).toBeNull();
});

it("calls TMDB with the Chinese language param", async () => {
  const user = await seedUser({ githubId: 222, githubLogin: "lang" });
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({ results: [] })));

  await app.request(
    "/api/metadata/search?q=test",
    { headers: { Cookie: `session=${await signSession({ userId: user.id }, env.JWT_SECRET)}` } },
    env,
  );
  const calledUrl = String(spy.mock.calls[0]?.[0]);
  expect(calledUrl).toContain("api.themoviedb.org/3/search/movie");
  expect(calledUrl).toContain("language=zh-CN");
});
