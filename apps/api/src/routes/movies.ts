import { zValidator } from "@hono/zod-validator";
import { createMovieSchema, movieListQuerySchema, updateMovieSchema } from "@watchlist/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { makeDb } from "../db/client";
import { movies } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

const route = new Hono<AppEnv>();

route.use("*", requireAuth);

route.get("/", zValidator("query", movieListQuerySchema), async (c) => {
  const { status, sort } = c.req.valid("query");
  const db = makeDb(c.env.DB);
  const where = status
    ? and(eq(movies.userId, c.var.user.id), eq(movies.status, status))
    : eq(movies.userId, c.var.user.id);
  const orderBy =
    sort === "title"
      ? asc(movies.title)
      : sort === "year"
        ? desc(movies.year)
        : sort === "rating"
          ? desc(movies.userRating)
          : desc(movies.createdAt);
  const rows = await db.select().from(movies).where(where).orderBy(orderBy);
  return c.json({ movies: rows });
});

route.post("/", zValidator("json", createMovieSchema), async (c) => {
  const input = c.req.valid("json");
  const db = makeDb(c.env.DB);
  const [movie] = await db
    .insert(movies)
    .values({ ...input, userId: c.var.user.id })
    .returning();
  if (!movie) return c.json({ error: "Insert failed" }, 500);
  return c.json({ movie }, 201);
});

route.patch("/:id", zValidator("json", updateMovieSchema), async (c) => {
  const id = Number(c.req.param("id"));
  const input = c.req.valid("json");
  const db = makeDb(c.env.DB);
  const [movie] = await db
    .update(movies)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(eq(movies.id, id), eq(movies.userId, c.var.user.id)))
    .returning();
  if (!movie) return c.json({ error: "Not found" }, 404);
  return c.json({ movie });
});

route.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = makeDb(c.env.DB);
  const [deleted] = await db
    .delete(movies)
    .where(and(eq(movies.id, id), eq(movies.userId, c.var.user.id)))
    .returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

export default route;
