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
