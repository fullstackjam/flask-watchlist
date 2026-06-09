import { beforeEach, expect, it } from "vitest";
import { applyMigrations, db, seedUser } from "./helpers";
import { movies } from "../src/db/schema";

beforeEach(async () => {
  await applyMigrations();
});

it("inserts and reads a movie scoped to a user", async () => {
  const user = await seedUser();
  await db().insert(movies).values({ userId: user.id, title: "Inception", status: "want" });
  const rows = await db().select().from(movies);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.title).toBe("Inception");
  expect(rows[0]?.userId).toBe(user.id);
});
