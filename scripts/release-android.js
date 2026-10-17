const path = require("path");
const { spawnSync } = require("child_process");
const publish = require("./publish-apk");

// npm run release:android
//
// A new version for everyone, in one go: builds the APK (`npm run
// build:android`, which raises the version when it has to) and, when the build
// works, publishes it (`npm run publish:apk`): the GitHub release, and the
// version, size and date on the website. Anything after `--` goes to
// publish:apk (for example --notes "What's new").
//
// On Windows the build runs in WSL, where the Android tools are (see the WSL
// notes in README.md), and the publishing runs here, where `gh` is signed in.
// Elsewhere both run here.
//
// `npm run build:android` alone still makes an APK to try first, without
// giving it to anyone.

const root = path.join(__dirname, "..");

/** The project's folder as WSL sees it: D:\Workplace\pianoverse -> /mnt/d/Workplace/pianoverse */
const wslPath = (windowsPath) =>
  windowsPath.replace(/^([A-Za-z]):\\/, (_, drive) => `/mnt/${drive.toLowerCase()}/`).replace(/\\/g, "/");

const build = () => {
  if (process.platform === "win32") {
    // An interactive shell reads ~/.bashrc, which sets up nvm, Java and the Android SDK
    const command = `cd '${wslPath(root)}' && npm run build:android -- --non-interactive`;
    return spawnSync("wsl", ["-e", "bash", "-ic", command], { stdio: "inherit" }).status ?? 1;
  }
  return spawnSync("npm", ["run", "build:android", "--", "--non-interactive"], { cwd: root, stdio: "inherit" }).status ?? 1;
};

if (require.main === module) {
  const status = build();
  if (status !== 0) {
    console.log("The build didn't finish, so nothing was published.");
    process.exit(status);
  }
  process.exit(publish.run({ args: process.argv.slice(2) }));
}

module.exports = { wslPath };
