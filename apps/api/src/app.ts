import { Hono } from "hono";
import auth from "./routes/auth";
import me from "./routes/me";
import movies from "./routes/movies";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>().basePath("/api");

const routes = app.route("/auth", auth).route("/me", me).route("/movies", movies);

export type AppType = typeof routes;
export default app;
