// https://docs.expo.dev/guides/using-eslint/
// ESLint's flat config (ESLint 8, which this replaces, no longer gets fixes).
const { defineConfig, globalIgnores } = require("eslint/config");
const expoFlat = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = defineConfig([
  expoFlat,
  globalIgnores(["node_modules/", ".expo/", "dist/", "coverage/"]),
  {
    rules: {
      // New in eslint-config-expo 57: the React Compiler's rules. The app was
      // written before them and doesn't use the compiler; moving the code over
      // is its own piece of work, so they are off until then.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/globals": "off",
      "react-hooks/immutability": "off",
    },
  },
  {
    // Batch 55: no `any` is left in the app's code, so a new one is an error.
    // (The tests below may still use it to stand in for a screen's props.)
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  {
    // Config files, scripts and the Appwrite Functions run in Node
    files: ["*.config.js", "scripts/**/*.js", "functions/**/*.js", "plugins/**/*.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // The reset page's plain scripts, loaded by old browsers without a build step
    files: ["web/**/*.js"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "no-var": "off" },
  },
  {
    files: ["__tests__/**/*"],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
    rules: {
      // jest.mock() calls go above the imports they replace
      "import/first": "off",
      // Inline mock components don't need names
      "react/display-name": "off",
    },
  },
  {
    files: ["__tests__/**/*.ts", "__tests__/**/*.tsx"],
    rules: {
      // jest.mock() factories can only require() what they return
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
