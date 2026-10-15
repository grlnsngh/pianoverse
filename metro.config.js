const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Expo's default, with the IDs Sentry uses to match a crash to its source map
module.exports = getSentryExpoConfig(__dirname);
