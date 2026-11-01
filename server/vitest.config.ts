import "dotenv/config";
import { defineConfig } from "vitest/config";

// Tests use a separate database: <your database>_test (e.g. kaytiapos_test). Never the real one.
const url = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/kaytiapos");
url.pathname = url.pathname.replace(/\/?$/, "") + "_test";
// `test.env` reaches the test workers only; the global setup reads this one.
process.env.TEST_DATABASE_URL = url.toString();

export default defineConfig({
  test: {
    env: { DATABASE_URL: url.toString(), AUTH_SECRET: "test-secret-".padEnd(48, "x"), NODE_ENV: "test" },
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000
  }
});
