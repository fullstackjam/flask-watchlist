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
  const results = await searchMetadata(q, c.env.TMDB_API_KEY);
  return c.json({ results });
});

export default route;
