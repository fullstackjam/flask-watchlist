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
            OMDB_API_KEY: "test-omdb-key",
            APP_URL: "http://localhost:5173",
          },
        },
      },
    },
  },
});
