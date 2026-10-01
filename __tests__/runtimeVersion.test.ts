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
const nativeConfig = () => {
  const config = { ...app };
  for (const key of ["version", "runtimeVersion", "updates", "extra", "web"]) {
    delete config[key];
  }
  config.android = { ...config.android };
  delete config.android.versionCode;
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
    expect(pkg.scripts.update).toBe("eas update --channel preview");
    expect(pkg.scripts["update:production"]).toBe(
      "eas update --channel production"
    );
  });

  it("gives every kind of build the channel it takes updates from", () => {
    const profiles = readJson("eas.json").build;

    for (const name of ["development", "preview", "production"]) {
      expect(profiles[name].channel).toBe(name);
    }
  });
});
