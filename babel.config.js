module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo adds the Reanimated (worklets) plugin itself
    presets: ["babel-preset-expo"],
    env: {
      production: {
        plugins: [
          // Debug logging costs time on every call; keep only warnings and errors
          ["transform-remove-console", { exclude: ["error", "warn"] }],
        ],
      },
    },
  };
};
