// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: "expo",
  ignorePatterns: ["/node_modules", "/.expo", "/dist", "/coverage"],
  rules: {
    // New in eslint-config-expo 57: the React Compiler's rules. The app was
    // written before them and doesn't use the compiler; moving the code over
    // is its own piece of work, so they are off until then.
    "react-hooks/refs": "off",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/globals": "off",
    "react-hooks/immutability": "off",
  },
  overrides: [
    {
      // Config files, scripts and the Appwrite Functions run in Node
      files: ["*.config.js", ".eslintrc.js", "scripts/**/*.js", "functions/**/*.js"],
      env: { node: true },
    },
    {
      // The reset page's plain scripts, loaded by old browsers without a build step
      files: ["web/**/*.js"],
      rules: { "no-var": "off" },
    },
    {
      files: ["__tests__/**/*"],
      env: { jest: true, node: true },
      rules: {
        // jest.mock() calls go above the imports they replace
        "import/first": "off",
        // jest.mock() factories can only require() what they return
        "@typescript-eslint/no-require-imports": "off",
        // Inline mock components don't need names
        "react/display-name": "off",
      },
    },
  ],
};
