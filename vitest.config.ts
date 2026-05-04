import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/vault/**/*.ts",
        "src/lib/session/**/*.ts",
        "src/lib/bunker/**/*.ts",
        "src/lib/schemas/**/*.ts",
        "src/lib/backup/**/*.ts",
        "src/lib/auth/session-cookie.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.tsx",
        "src/**/*.d.ts",
        "next-env.d.ts",
        "scripts/**",
      ],
    },
  },
});
