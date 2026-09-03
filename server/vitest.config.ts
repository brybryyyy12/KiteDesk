import {
  defineConfig,
} from "vitest/config";

export default defineConfig({
  test: {
    environment:
      "node",

    setupFiles: [
      "./src/tests/setup.ts",
    ],

    /*
     * Integration tests reset the same
     * dedicated PostgreSQL test database.
     * Keep test files sequential so one
     * file cannot wipe another file's data.
     */
    fileParallelism:
      false,

    testTimeout:
      20_000,

    hookTimeout:
      20_000,

    coverage: {
      provider:
        "v8",

      reporter: [
        "text",
        "html",
      ],

      include: [
        "src/controllers/**/*.ts",
        "src/middleware/**/*.ts",
        "src/lib/**/*.ts",
        "src/utils/**/*.ts",
      ],

      exclude: [
        "src/generated/**",
        "src/tests/**",
      ],
    },
  },
});
