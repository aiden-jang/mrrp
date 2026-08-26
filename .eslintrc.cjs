/*
 * Matches the config in the other repos, and exists for one specific reason.
 *
 * owewell shipped a useEffect below a component's early returns. The first render bailed out before
 * reaching it and the next render ran one hook more, which is React error #310, and it took out every
 * group page the instant its data arrived. Typecheck, build and the whole test suite were green the
 * entire time. Nothing but a static rule sees that class of bug.
 *
 * mrrp had no lint at all, so it was exposed to exactly the same thing. CI runs this before it deploys.
 */
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
