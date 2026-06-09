import { Hono } from "hono";
import { optionalAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

const me = new Hono<AppEnv>();

me.get("/", optionalAuth, (c) => {
  const user = c.get("user");
  return c.json({ user: user ?? null });
});

export default me;
