const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');

try {
  // Read the app.json file
  const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonContent);

  // Increment version
  const currentVersion = appJson.expo.version;
  const versionParts = currentVersion.split('.');
  const lastPart = parseInt(versionParts[versionParts.length - 1], 10);
  versionParts[versionParts.length - 1] = (lastPart + 1).toString();
  const newVersion = versionParts.join('.');
  appJson.expo.version = newVersion;

  // Increment versionCode
  const currentVersionCode = appJson.expo.android.versionCode;
  appJson.expo.android.versionCode = currentVersionCode + 1;

  // Write back to app.json
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

  console.log(`Version incremented from ${currentVersion} to ${newVersion}`);
  console.log(`VersionCode incremented from ${currentVersionCode} to ${appJson.expo.android.versionCode}`);
} catch (error) {
  console.error('Error updating app.json:', error.message);
  process.exit(1);
}
