import { Hono } from "hono";
import auth from "./routes/auth";
import me from "./routes/me";
import metadata from "./routes/metadata";
import movies from "./routes/movies";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>().basePath("/api");

const routes = app
  .route("/auth", auth)
  .route("/me", me)
  .route("/movies", movies)
  .route("/metadata", metadata);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export type AppType = typeof routes;
export default app;
