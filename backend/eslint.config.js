// STATUS: UPDATED
// File: eslint.config.js

import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "coverage/**", "dist/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "no-undef": "error",
      "no-unreachable": "error",
      "no-constant-condition": "error",
    },
  },
  {
    files: [
      "src/core/crawler.js",
      "src/scanners/authentication/scanner.js",
      "src/services/browserAuthentication.service.js",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];

// npm run format:check

// npm run lint
// npm run format:check
// npm test
