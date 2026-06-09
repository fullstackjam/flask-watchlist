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
    if (!created) throw new Error("failed to create user");
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
