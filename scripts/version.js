const fs = require("fs");

// The app's version number and Android versionCode live in app.json. These
// helpers read, raise and write them; `increment-version.js` (npm run plus)
// and `build-android.js` (npm run build:android) both use them.

/** "1.1.9" becomes "1.1.10": the last part goes up by one. */
const bumpVersion = (version) => {
  const parts = String(version).split(".");
  const last = parseInt(parts[parts.length - 1], 10);
  parts[parts.length - 1] = String((Number.isNaN(last) ? 0 : last) + 1);
  return parts.join(".");
};

/** A copy of app.json's contents with the version and versionCode raised by one. */
const bumped = (appJson) => ({
  ...appJson,
  expo: {
    ...appJson.expo,
    version: bumpVersion(appJson.expo.version),
    android: {
      ...appJson.expo.android,
      versionCode: appJson.expo.android.versionCode + 1,
    },
  },
});

/**
 * Whether the version has to go up before a build: it does when the record of
 * the last build says this versionCode (or a higher one) was already built,
 * since Android only installs an APK whose versionCode is higher than the
 * installed one. With no record it does too, to be safe.
 */
const needsBump = (appJson, record) =>
  !record ||
  typeof record.versionCode !== "number" ||
  appJson.expo.android.versionCode <= record.versionCode;

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const readJsonIfExists = (file) => {
  try {
    return readJson(file);
  } catch {
    return null;
  }
};

/** Writes `data` as JSON with two spaces, keeping the line endings and the final newline the file already had. */
const writeJson = (file, data) => {
  let old = "";
  try {
    old = fs.readFileSync(file, "utf8");
  } catch {
    // A new file
  }
  const eol = old.includes("\r\n") ? "\r\n" : "\n";
  const finalNewline = old === "" ? true : /\r?\n$/.test(old);
  const text = JSON.stringify(data, null, 2).replace(/\n/g, eol);
  fs.writeFileSync(file, finalNewline ? text + eol : text);
};

module.exports = { bumpVersion, bumped, needsBump, readJson, readJsonIfExists, writeJson };
