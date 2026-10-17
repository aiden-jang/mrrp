// Enforce hook order; typechecking cannot detect conditional-hook failures.
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { browser: true, es2022: true },
  ignorePatterns: ["dist", "node_modules", ".wrangler", "*.config.ts", "*.config.js", "scripts"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    // The whole point of this file.
    "react-hooks/rules-of-hooks": "error",
    // Warn only. Exhaustive deps is a real judgement call often enough that erroring on it trains you
    // to disable the line, which would take rules-of-hooks down with it.
    "react-hooks/exhaustive-deps": "warn",
  },
  overrides: [
    {
      // Non-null assertions are the house style in the sprite and palette code, where a missing entry
      // is a programming error the tests already catch, not a runtime condition to handle.
      files: ["**/*.ts", "**/*.tsx"],
      rules: { "@typescript-eslint/no-non-null-assertion": "off" },
    },
  ],
};
