// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: "expo",
  ignorePatterns: ["/node_modules", "/.expo", "/dist", "/coverage"],
  overrides: [
    {
      // Config files and scripts run in Node
      files: ["*.config.js", ".eslintrc.js", "scripts/**/*.js"],
      env: { node: true },
    },
    {
      files: ["__tests__/**/*"],
      env: { jest: true, node: true },
      rules: {
        // jest.mock() calls go above the imports they replace
        "import/first": "off",
        // Inline mock components don't need names
        "react/display-name": "off",
      },
    },
  ],
};
