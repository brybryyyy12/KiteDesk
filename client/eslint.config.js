import js from "@eslint/js";

import globals from "globals";

import reactHooks from "eslint-plugin-react-hooks";

import reactRefresh from "eslint-plugin-react-refresh";

import tseslint from "typescript-eslint";

import {
  defineConfig,
  globalIgnores,
} from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
  ]),

  {
    files: [
      "**/*.{ts,tsx}",
    ],

    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      globals:
        globals.browser,
    },

    rules: {
      /*
       * "_" means intentionally unused.
       */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      /*
       * KiteDesk intentionally loads API data
       * and resets/synchronizes UI state from effects.
       *
       * These newer React lint rules are useful
       * suggestions but should not block CI.
       */
      "react-hooks/set-state-in-effect":
        "off",

      "react-hooks/preserve-manual-memoization":
        "off",
    },
  },

  /*
   * Context modules intentionally export
   * Providers together with hooks/helpers.
   */
  {
    files: [
      "src/context/**/*.{ts,tsx}",
    ],

    rules: {
      "react-refresh/only-export-components":
        "off",
    },
  },
]);