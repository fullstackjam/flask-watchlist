import { hc } from "hono/client";
import type { AppType } from "../../../api/src/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// TypeScript cannot infer the Hono RPC client type across the package boundary when
// route handlers return union types (e.g. `User | null`) via drizzle $inferSelect —
// the schema type grows too complex for Client<T> to resolve. Cast to any so the
// runtime Proxy works correctly; hooks add explicit response-shape annotations.
export const api = hc<AppType>("/", {
  init: { credentials: "include" },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;
