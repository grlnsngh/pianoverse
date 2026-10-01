const path = require("path");
const { bumped, readJson, writeJson } = require("./version");

const appJsonPath = path.join(__dirname, "..", "app.json");

try {
  const appJson = readJson(appJsonPath);
  const next = bumped(appJson);

  writeJson(appJsonPath, next);

  console.log(
    `Version incremented from ${appJson.expo.version} to ${next.expo.version}`
  );
  console.log(
    `VersionCode incremented from ${appJson.expo.android.versionCode} to ${next.expo.android.versionCode}`
  );
} catch (error) {
  console.error("Error updating app.json:", error.message);
  process.exit(1);
}
