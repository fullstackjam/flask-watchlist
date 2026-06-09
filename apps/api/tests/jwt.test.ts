import { expect, it } from "vitest";
import { signSession, verifySession } from "../src/lib/jwt";

const SECRET = "test-jwt-secret-value-please";

it("round-trips a session token", async () => {
  const token = await signSession({ userId: 42 }, SECRET);
  const payload = await verifySession(token, SECRET);
  expect(payload?.userId).toBe(42);
});

it("rejects a token signed with a different secret", async () => {
  const token = await signSession({ userId: 42 }, SECRET);
  const payload = await verifySession(token, "wrong-secret");
  expect(payload).toBeNull();
});
