import { sign, verify } from "hono/jwt";

export type SessionPayload = { userId: number };

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days
  return sign({ ...payload, exp }, secret, "HS256");
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const payload = await verify(token, secret, "HS256");
    if (typeof payload.userId !== "number") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
