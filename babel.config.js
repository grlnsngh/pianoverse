module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
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
