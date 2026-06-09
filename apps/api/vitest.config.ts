import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.test.jsonc" },
        miniflare: {
          compatibilityFlags: ["nodejs_compat"],
          bindings: {
            GITHUB_CLIENT_ID: "test-client-id",
            GITHUB_CLIENT_SECRET: "test-client-secret",
            JWT_SECRET: "test-jwt-secret-value-please",
            TMDB_API_KEY: "test-tmdb-key",
            APP_URL: "http://localhost:5173",
          },
        },
      },
    },
  },
});
