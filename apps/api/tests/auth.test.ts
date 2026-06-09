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
