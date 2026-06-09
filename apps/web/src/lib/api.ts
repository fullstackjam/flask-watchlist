import { hc } from "hono/client";
import type { AppType } from "../../../api/src/app";

export const api = hc<AppType>("/", {
  init: { credentials: "include" },
});
