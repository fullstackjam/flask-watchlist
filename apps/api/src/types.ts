import type { User } from "./db/schema";

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  OMDB_API_KEY: string;
  APP_URL: string;
};

export type Variables = {
  user: User;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
