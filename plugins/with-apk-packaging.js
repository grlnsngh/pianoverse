const { withGradleProperties } = require("expo/config-plugins");

/**
 * How the APK the website gives out is packed (the EAS build profile
 * "preview", which `npm run release:android` builds), so it downloads at about
 * a third of its old size. The full "test" build (`npm run build:android`) is
 * left as it was, so it runs on the emulators too:
 *
 * - only the code real phones run: 64-bit ARM (almost every phone) and 32-bit
 *   ARM (older and cheaper phones). The x86 parts are for computer emulators;
 *   they were 63 MB of the 147.
 * - the native libraries compressed in the APK (Gradle's "legacy packaging"),
 *   49 MB down to 19. The phone unpacks them when it installs the app, so the
 *   installed app takes a little more room than the download.
 * - the app's Java and Kotlin code minified by R8 (Batch 50, O1): what is never
 *   called is left out and the rest gets short names. This one is on the full
 *   "test" build too, so the code that is tried is the code that ships.
 *
 * Nothing in the app's code changes, so the same JavaScript runs on it and
 * over-the-air updates still reach it (see __tests__/runtimeVersion.test.ts,
 * which counts this as a build-only plugin). The store's app bundle (profile
 * "production") is left as it was: Google Play sends each phone only the
 * parts it runs.
 */

/** R8 minifying, on every APK the owner installs or gives out. */
const MINIFY = { "android.enableMinifyInReleaseBuilds": "true" };

/** The Gradle settings for a build profile: none for the store's bundle or a development build. */
const packagingProperties = (profile) => {
  if (profile === "preview") {
    return { reactNativeArchitectures: "arm64-v8a,armeabi-v7a", "expo.useLegacyPackaging": "true", ...MINIFY };
  }
  // The full test build keeps every processor's code, so it runs on the emulators
  if (profile === "test") return { ...MINIFY };
  return {};
};

/** gradle.properties' entries with these settings put in, replacing any value they had. */
const applyProperties = (entries, properties) => {
  const result = entries.filter((entry) => !(entry.type === "property" && entry.key in properties));
  for (const [key, value] of Object.entries(properties)) result.push({ type: "property", key, value });
  return result;
};

const withApkPackaging = (config) =>
  withGradleProperties(config, (gradle) => {
    gradle.modResults = applyProperties(gradle.modResults, packagingProperties(process.env.EAS_BUILD_PROFILE));
    return gradle;
  });

module.exports = withApkPackaging;
module.exports.packagingProperties = packagingProperties;
module.exports.applyProperties = applyProperties;
