import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  githubId: integer("github_id").notNull().unique(),
  githubLogin: text("github_login").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const movies = sqliteTable("movies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  imdbId: text("imdb_id"),
  title: text("title").notNull(),
  year: text("year"),
  posterUrl: text("poster_url"),
  overview: text("overview"),
  genres: text("genres", { mode: "json" }).$type<string[]>(),
  externalRating: text("external_rating"),
  status: text("status", { enum: ["want", "watching", "watched"] }).notNull().default("want"),
  userRating: integer("user_rating"),
  notes: text("notes"),
  watchedAt: text("watched_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type Movie = typeof movies.$inferSelect;
