import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { makeDb } from "../db/client";
import { users } from "../db/schema";
import { verifySession } from "../lib/jwt";
import type { AppEnv } from "../types";

async function resolveUser(c: Context<AppEnv>) {
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
