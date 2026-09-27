module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["nativewind/babel", "react-native-reanimated/plugin"],
    env: {
      production: {
        plugins: [
          "react-native-paper/babel",
          // Debug logging costs time on every call; keep only warnings and errors
          ["transform-remove-console", { exclude: ["error", "warn"] }],
        ],
      },
    },
  };
};
