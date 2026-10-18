import fs from "fs";
import path from "path";

/**
 * Over-the-air updates only reach builds with the same runtime version
 * (app.json), because an update is JavaScript, and JavaScript that expects a
 * native module the installed build doesn't have crashes the app. So the
 * runtime version has to change whenever the native part of the app changes.
 * This test records the native part for each runtime version and fails when it
 * changes without a new one.
 *
 * When it fails: a native package or a native setting changed. Change
 * `runtimeVersion` in app.json to the next number, copy the new lists below
 * into a new entry (keep the old entries), and make a new build before
 * publishing any update.
 */

const root = path.join(__dirname, "..");
const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const app = readJson("app.json").expo;
const pkg = readJson("package.json");

/** The packages that contain native code, with the versions installed. */
const nativePackages = () =>
  Object.keys(pkg.dependencies)
    .filter((name) => {
      const dir = path.join(root, "node_modules", name);
      return (
        fs.existsSync(path.join(dir, "android")) ||
        // React Native itself keeps its Android code here
        fs.existsSync(path.join(dir, "ReactAndroid")) ||
        fs.existsSync(path.join(dir, "ios")) ||
        fs.existsSync(path.join(dir, "expo-module.config.json"))
      );
    })
    .sort()
    .map(
      (name) =>
        `${name}@${readJson(`node_modules/${name}/package.json`).version}`
    );

/** What app.json says about the native app: all but what a build or an update can change alone. */
/**
 * Plugins that only change how the APK is packed (which processors' code it
 * carries, whether its libraries are compressed), not the native code the
 * JavaScript calls, so a build with or without them takes the same updates.
 */
const BUILD_ONLY_PLUGINS = ["./plugins/with-apk-packaging"];

const nativeConfig = () => {
  const config = { ...app };
  for (const key of ["version", "runtimeVersion", "updates", "extra", "web"]) {
    delete config[key];
  }
  config.android = { ...config.android };
  delete config.android.versionCode;
  config.plugins = (config.plugins ?? []).filter(
    (plugin: unknown) => !(typeof plugin === "string" && BUILD_ONLY_PLUGINS.includes(plugin))
  );
  return config;
};

const RECORDED: Record<string, { packages: string[]; config: unknown }> = {
  "1": {
    packages: [
      "@react-native-async-storage/async-storage@1.23.1",
      "expo@51.0.39",
      "expo-constants@16.0.2",
      "expo-dev-client@4.0.21",
      "expo-file-system@17.0.1",
      "expo-font@12.0.10",
      "expo-haptics@13.0.1",
      "expo-image@1.12.13",
      "expo-image-manipulator@12.0.5",
      "expo-image-picker@15.0.7",
      "expo-intent-launcher@11.0.1",
      "expo-notifications@0.28.19",
      "expo-router@3.5.20",
      "expo-sharing@12.0.1",
      "expo-splash-screen@0.27.5",
      "expo-system-ui@3.0.7",
      "expo-updates@0.25.28",
      "react-native@0.74.3",
      "react-native-gesture-handler@2.16.2",
      "react-native-reanimated@3.10.1",
      "react-native-safe-area-context@4.10.5",
      "react-native-screens@3.31.1",
      "react-native-svg@15.2.0",
    ],
    config: {
      name: "pianoverse",
      slug: "pianoverse",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: "pianoverse",
      userInterfaceStyle: "light",
      backgroundColor: "#FFFFFF",
      splash: { backgroundColor: "#FF9C01" },
      ios: { supportsTablet: true },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        package: "com.grlnsngh.pianoverse",
      },
      plugins: [
        "expo-router",
        [
          "expo-image-picker",
          {
            photosPermission:
              "Pianoverse uses your photos so you can add pictures of your pianos.",
            cameraPermission:
              "Pianoverse uses the camera so you can take pictures of your pianos.",
          },
        ],
      ],
      experiments: { typedRoutes: true },
    },
  },
  "2": {
    packages: [
      "@react-native-async-storage/async-storage@1.23.1",
      "expo@51.0.39",
      "expo-constants@16.0.2",
      "expo-dev-client@4.0.21",
      "expo-file-system@17.0.1",
      "expo-font@12.0.10",
      "expo-haptics@13.0.1",
      "expo-image@1.12.13",
      "expo-image-manipulator@12.0.5",
      "expo-image-picker@15.0.7",
      "expo-intent-launcher@11.0.1",
      "expo-local-authentication@14.0.1",
      "expo-notifications@0.28.19",
      "expo-router@3.5.20",
      "expo-sharing@12.0.1",
      "expo-splash-screen@0.27.5",
      "expo-system-ui@3.0.7",
      "expo-updates@0.25.28",
      "react-native@0.74.3",
      "react-native-gesture-handler@2.16.2",
      "react-native-reanimated@3.10.1",
      "react-native-safe-area-context@4.10.5",
      "react-native-screens@3.31.1",
      "react-native-svg@15.2.0",
    ],
    config: {
      name: "pianoverse",
      slug: "pianoverse",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: "pianoverse",
      userInterfaceStyle: "light",
      backgroundColor: "#FFFFFF",
      splash: { backgroundColor: "#FF9C01" },
      ios: { supportsTablet: true },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        package: "com.grlnsngh.pianoverse",
      },
      plugins: [
        "expo-router",
        [
          "expo-image-picker",
          {
            photosPermission:
              "Pianoverse uses your photos so you can add pictures of your pianos.",
            cameraPermission:
              "Pianoverse uses the camera so you can take pictures of your pianos.",
          },
        ],
        [
          "expo-local-authentication",
          { faceIDPermission: "Pianoverse uses Face ID to unlock the app." },
        ],
      ],
      experiments: { typedRoutes: true },
    },
  },
  "3": {
    packages: [
      "@react-native-async-storage/async-storage@1.23.1",
      "expo@51.0.39",
      "expo-constants@16.0.2",
      "expo-dev-client@4.0.21",
      "expo-file-system@17.0.1",
      "expo-font@12.0.10",
      "expo-haptics@13.0.1",
      "expo-image@1.12.13",
      "expo-image-manipulator@12.0.5",
      "expo-image-picker@15.0.7",
      "expo-intent-launcher@11.0.1",
      "expo-local-authentication@14.0.1",
      "expo-notifications@0.28.19",
      "expo-router@3.5.20",
      "expo-sharing@12.0.1",
      "expo-splash-screen@0.27.5",
      "expo-system-ui@3.0.7",
      "expo-updates@0.25.28",
      "expo-web-browser@13.0.3",
      "react-native@0.74.3",
      "react-native-gesture-handler@2.16.2",
      "react-native-reanimated@3.10.1",
      "react-native-safe-area-context@4.10.5",
      "react-native-screens@3.31.1",
      "react-native-svg@15.2.0",
    ],
    config: {
      name: "pianoverse",
      slug: "pianoverse",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: ["pianoverse", "appwrite-callback-66b2693000154e2fa3c8"],
      userInterfaceStyle: "light",
      backgroundColor: "#FFFFFF",
      splash: { backgroundColor: "#FF9C01" },
      ios: { supportsTablet: true },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        package: "com.grlnsngh.pianoverse",
      },
      plugins: [
        "expo-router",
        [
          "expo-image-picker",
          {
            photosPermission:
              "Pianoverse uses your photos so you can add pictures of your pianos.",
            cameraPermission:
              "Pianoverse uses the camera so you can take pictures of your pianos.",
          },
        ],
        [
          "expo-local-authentication",
          { faceIDPermission: "Pianoverse uses Face ID to unlock the app." },
        ],
      ],
      experiments: { typedRoutes: true },
    },
  },
  // Expo SDK 57 (React Native 0.86): every native package changed, the
  // splash screen moved from "splash" to the expo-splash-screen plugin, and
  // the microphone and draw-over-other-apps permissions were dropped
  "4": {
    packages: [
      "@react-native-async-storage/async-storage@2.2.0",
      "expo@57.0.28",
      "expo-constants@57.0.21",
      "expo-dev-client@57.0.20",
      "expo-file-system@57.0.7",
      "expo-font@57.0.4",
      "expo-haptics@57.0.3",
      "expo-image@57.0.5",
      "expo-image-manipulator@57.0.21",
      "expo-image-picker@57.0.20",
      "expo-intent-launcher@57.0.1",
      "expo-linking@57.0.12",
      "expo-local-authentication@57.0.3",
      "expo-notifications@57.0.22",
      "expo-router@57.0.26",
      "expo-sharing@57.0.23",
      "expo-splash-screen@57.0.10",
      "expo-status-bar@57.0.1",
      "expo-system-ui@57.0.4",
      "expo-updates@57.0.26",
      "expo-web-browser@57.0.3",
      "react-native@0.86.3",
      "react-native-gesture-handler@2.32.0",
      "react-native-reanimated@4.5.1",
      "react-native-safe-area-context@5.7.0",
      "react-native-screens@4.26.2",
      "react-native-svg@15.15.4",
      "react-native-worklets@0.10.1",
    ],
    config: {
      name: "pianoverse",
      slug: "pianoverse",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: ["pianoverse", "appwrite-callback-66b2693000154e2fa3c8"],
      userInterfaceStyle: "light",
      backgroundColor: "#FFFFFF",
      ios: { supportsTablet: true },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        package: "com.grlnsngh.pianoverse",
        blockedPermissions: ["android.permission.SYSTEM_ALERT_WINDOW"],
      },
      plugins: [
        "expo-router",
        [
          "expo-splash-screen",
          { backgroundColor: "#FF9C01", image: "./assets/images/splash-blank.png" },
        ],
        [
          "expo-image-picker",
          {
            photosPermission:
              "Pianoverse uses your photos so you can add pictures of your pianos.",
            cameraPermission:
              "Pianoverse uses the camera so you can take pictures of your pianos.",
            microphonePermission: false,
          },
        ],
        [
          "expo-local-authentication",
          { faceIDPermission: "Pianoverse uses Face ID to unlock the app." },
        ],
      ],
      experiments: { typedRoutes: true },
    },
  },
  // Paper forms: expo-print turns the forms into PDFs, and expo-asset (which
  // expo already had inside it) reads the font files the PDFs are set in.
  // The letterhead added react-native-webview (the real-page preview) before
  // any build of runtime 5 was made, so it joined runtime 5 rather than 6, and
  // so did Sentry's crash reports (Batch 34) and its plugin, and the QR scanner's
  // camera (expo-camera, Batch 46) and its plugin
  "5": {
    packages: [
      "@react-native-async-storage/async-storage@2.2.0",
      "@sentry/react-native@7.11.0",
      "expo@57.0.30",
      "expo-asset@57.0.20",
      "expo-camera@57.0.6",
      "expo-constants@57.0.22",
      "expo-dev-client@57.0.20",
      "expo-file-system@57.0.7",
      "expo-font@57.0.4",
      "expo-haptics@57.0.3",
      "expo-image@57.0.5",
      "expo-image-manipulator@57.0.21",
      "expo-image-picker@57.0.20",
      "expo-intent-launcher@57.0.1",
      "expo-linking@57.0.13",
      "expo-local-authentication@57.0.3",
      "expo-notifications@57.0.23",
      "expo-print@57.0.2",
      "expo-router@57.0.28",
      "expo-sharing@57.0.23",
      "expo-splash-screen@57.0.10",
      "expo-status-bar@57.0.1",
      "expo-system-ui@57.0.4",
      "expo-updates@57.0.26",
      "expo-web-browser@57.0.3",
      "react-native@0.86.3",
      "react-native-gesture-handler@2.32.0",
      "react-native-reanimated@4.5.1",
      "react-native-safe-area-context@5.7.0",
      "react-native-screens@4.26.2",
      "react-native-svg@15.15.4",
      "react-native-webview@13.16.1",
      "react-native-worklets@0.10.1",
    ],
    config: {
      name: "pianoverse",
      slug: "pianoverse",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: ["pianoverse", "appwrite-callback-66b2693000154e2fa3c8"],
      // "automatic" since Batch 32 (the app starts matching the phone, Q34),
      // before any runtime 5 build was made, so it is still runtime 5
      userInterfaceStyle: "automatic",
      backgroundColor: "#FFFFFF",
      ios: { supportsTablet: true },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        package: "com.grlnsngh.pianoverse",
        blockedPermissions: ["android.permission.SYSTEM_ALERT_WINDOW"],
      },
      plugins: [
        "expo-router",
        [
          "expo-splash-screen",
          { backgroundColor: "#FF9C01", image: "./assets/images/splash-blank.png" },
        ],
        [
          "expo-image-picker",
          {
            photosPermission:
              "Pianoverse uses your photos so you can add pictures of your pianos.",
            cameraPermission:
              "Pianoverse uses the camera so you can take pictures of your pianos.",
            microphonePermission: false,
          },
        ],
        [
          "expo-camera",
          {
            cameraPermission: "Pianoverse uses the camera to scan the labels on your pianos.",
            microphonePermission: false,
            recordAudioAndroid: false,
          },
        ],
        [
          "expo-local-authentication",
          { faceIDPermission: "Pianoverse uses Face ID to unlock the app." },
        ],
        [
          "@sentry/react-native",
          { organization: "grow-by-pixel", project: "pianoverse", url: "https://sentry.io/" },
        ],
      ],
      experiments: { typedRoutes: true },
    },
  },
};

describe("the runtime version for over-the-air updates", () => {
  it("is a fixed number in app.json, which this test knows the native part of", () => {
    expect(typeof app.runtimeVersion).toBe("string");
    expect(Object.keys(RECORDED)).toContain(app.runtimeVersion);
  });

  it("changes whenever a native package changes (bump it, record it here, make a new build)", () => {
    expect(nativePackages()).toEqual(RECORDED[app.runtimeVersion].packages);
  });

  it("changes whenever a native setting in app.json changes (permissions, plugins, icon, splash, scheme)", () => {
    expect(nativeConfig()).toEqual(RECORDED[app.runtimeVersion].config);
  });
});

describe("the update setup", () => {
  it("points updates at this project's address on Expo, and checks when the app starts", () => {
    expect(app.updates.url).toBe(
      `https://u.expo.dev/${app.extra.eas.projectId}`
    );
    expect(app.updates.checkAutomatically).toBe("ON_LOAD");
    // The app starts at once with what it has, and uses an update from the next start
    expect(app.updates.fallbackToCacheTimeout).toBe(0);
  });

  it("installs expo-updates", () => {
    expect(pkg.dependencies["expo-updates"]).toBeDefined();
  });

  it("has a command to publish a fix to the builds you install, and one for the store", () => {
    // EAS CLI asks which environment's variables an update is made with
    expect(pkg.scripts.update).toBe("eas update --channel preview --environment preview");
    expect(pkg.scripts["update:production"]).toBe(
      "eas update --channel production --environment production"
    );
  });

  it("gives every kind of build the channel it takes updates from", () => {
    const profiles = readJson("eas.json").build;

    for (const name of ["development", "preview", "production"]) {
      expect(profiles[name].channel).toBe(name);
    }
    // The full test build is the website's APK unpacked: the same channel, so the same updates
    expect(profiles.test).toEqual({ extends: "preview" });
  });
});

describe("the APK's packing (plugins/with-apk-packaging.js)", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { packagingProperties, applyProperties } = require("../plugins/with-apk-packaging");

  it("is a build-only plugin in app.json, and changes nothing the JavaScript runs on", () => {
    expect(app.plugins).toContain("./plugins/with-apk-packaging");
    expect(BUILD_ONLY_PLUGINS).toEqual(["./plugins/with-apk-packaging"]);
  });

  it("packs the website's APK with only the phones' code and its libraries compressed, and leaves the store's bundle alone", () => {
    expect(packagingProperties("preview")).toEqual({
      reactNativeArchitectures: "arm64-v8a,armeabi-v7a",
      "expo.useLegacyPackaging": "true",
      "android.enableMinifyInReleaseBuilds": "true",
    });
    expect(packagingProperties("production")).toEqual({});
    // The full test build runs on the emulators too, and is minified like the website's, so what is tried is what ships
    expect(packagingProperties("test")).toEqual({ "android.enableMinifyInReleaseBuilds": "true" });
    expect(packagingProperties(undefined)).toEqual({});
  });

  it("replaces the template's settings instead of adding a second line for them", () => {
    const template = [
      { type: "comment", value: "Use this property to specify which architecture you want to build." },
      { type: "property", key: "reactNativeArchitectures", value: "armeabi-v7a,arm64-v8a,x86,x86_64" },
      { type: "property", key: "expo.useLegacyPackaging", value: "false" },
      { type: "property", key: "hermesEnabled", value: "true" },
    ];
    const result = applyProperties(template, packagingProperties("preview"));

    expect(result.filter((entry: { key?: string }) => entry.key === "reactNativeArchitectures")).toEqual([
      { type: "property", key: "reactNativeArchitectures", value: "arm64-v8a,armeabi-v7a" },
    ]);
    expect(result.filter((entry: { key?: string }) => entry.key === "expo.useLegacyPackaging")).toEqual([
      { type: "property", key: "expo.useLegacyPackaging", value: "true" },
    ]);
    expect(result).toContainEqual({ type: "property", key: "hermesEnabled", value: "true" });
    expect(applyProperties(template, packagingProperties("production"))).toEqual(template);
  });
});
