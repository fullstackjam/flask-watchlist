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

  const bobList = await app.request("/api/movies", { headers: { Cookie: await cookieFor(bob.id) } }, env);
  expect(((await bobList.json()) as { movies: unknown[] }).movies).toHaveLength(0);

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
