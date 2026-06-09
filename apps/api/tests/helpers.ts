import { env } from "cloudflare:test";
import { makeDb } from "../src/db/client";
import { users } from "../src/db/schema";

export const db = () => makeDb(env.DB as D1Database);

// Apply all generated migrations to the isolated per-test D1 database.
export async function applyMigrations() {
  const migrations = import.meta.glob("../drizzle/*.sql", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  for (const path of Object.keys(migrations).sort()) {
    const sql = migrations[path];
    for (const stmt of sql.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (trimmed) await (env.DB as D1Database).exec(trimmed.replace(/\n/g, " "));
    }
  }
}

export async function seedUser(overrides: Partial<{ githubId: number; githubLogin: string }> = {}) {
  const [user] = await db()
    .insert(users)
    .values({
      githubId: overrides.githubId ?? 1001,
      githubLogin: overrides.githubLogin ?? "alice",
      name: "Alice",
      avatarUrl: "https://example.com/a.png",
    })
    .returning();
  return user;
}
