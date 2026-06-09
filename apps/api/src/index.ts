import app from "./app";
import type { Bindings } from "./types";

// run_worker_first is true, so every request hits the Worker. API requests go
// to the Hono app; everything else is served from Static Assets (the SPA, with
// single-page-application not_found_handling returning index.html for client routes).
export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
