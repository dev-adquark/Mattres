import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // `const { a, ...rest } = obj` is the idiomatic way to omit keys.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true, argsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Isolated dev servers (NEXT_DIST_DIR=.next-<name>) used by parallel agents.
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local QA scratch folders (Playwright scripts), never committed.
    ".qa-*/**",
  ]),
]);

export default eslintConfig;
