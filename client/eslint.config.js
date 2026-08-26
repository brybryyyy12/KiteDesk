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
       * Allow intentionally unused
       * arguments/variables when their
       * names begin with "_".
       *
       * Examples:
       * _projectId
       * _totalTasks
       * _completedTasks
       * _actor
       */
      "@typescript-eslint/no-unused-vars":
        [
          "error",
          {
            argsIgnorePattern:
              "^_",
            varsIgnorePattern:
              "^_",
            caughtErrorsIgnorePattern:
              "^_",
          },
        ],
    },
  },

  /*
   * React context files commonly export
   * both a Provider component and hooks/
   * helper functions.
   *
   * Example:
   * AuthProvider + useAuth
   * ToastProvider + toast
   *
   * This structure is intentional, so
   * Fast Refresh should not fail lint.
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