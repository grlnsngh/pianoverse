const path = require("path");
const { spawnSync } = require("child_process");
const {
  bumped,
  needsBump,
  readJson,
  readJsonIfExists,
  writeJson,
} = require("./version");

// npm run build:android
//
// Makes an Android build to try on this computer (`eas build -p android
// --profile test --local`), raising the version first when that is needed: if
// `last-build.json` says this versionCode was already built, the version and
// versionCode go up by one, because Android only installs an APK with a higher
// versionCode than the one on the phone. When the build works, it writes down
// what was built in `last-build.json`.
//
// The "test" build is the full one: it carries the code of every kind of
// processor, so it runs on the emulators as well as on phones. The website's
// APK is the small "preview" build, made by `npm run release:android`, which
// carries only the phones' code (plugins/with-apk-packaging.js). Both take the
// same over-the-air updates.
//
//   npm run build:android                  bump if needed, then build
//   npm run build:android -- --bump        bump even if it isn't needed
//   npm run build:android -- --no-bump     build with the version as it is
//   npm run build:android -- --profile production   anything else goes to eas

const runEas = (args) => {
  const result = spawnSync("eas", args, {
    stdio: "inherit",
    // eas is a .cmd file on Windows, which only a shell can start
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(`Couldn't start eas: ${result.error.message}`);
    return 1;
  }
  return result.status === null ? 1 : result.status;
};

/**
 * Raises the version if it has to go up, builds, and records the build.
 * Returns the exit code. `spawn` runs eas and is only replaced in tests.
 */
const run = ({
  args,
  root = path.join(__dirname, ".."),
  spawn = runEas,
  now = () => new Date(),
  log = console.log,
}) => {
  const force = args.includes("--bump");
  const skip = args.includes("--no-bump");
  if (force && skip) {
    log("Use --bump or --no-bump, not both.");
    return 1;
  }
  const rest = args.filter((arg) => arg !== "--bump" && arg !== "--no-bump");

  const appPath = path.join(root, "app.json");
  const recordPath = path.join(root, "last-build.json");
  let app = readJson(appPath);
  const record = readJsonIfExists(recordPath);
  const label = (json) => `${json.expo.version} (versionCode ${json.expo.android.versionCode})`;

  if (skip) {
    log(`Building ${label(app)} as it is (--no-bump).`);
  } else if (force || needsBump(app, record)) {
    const before = label(app);
    app = bumped(app);
    writeJson(appPath, app);
    const why = force
      ? "--bump was given"
      : !record || typeof record.versionCode !== "number"
        ? "there is no record of an earlier build"
        : `${before} was already built`;
    log(`The version goes up, because ${why}: ${before} -> ${label(app)}.`);
  } else {
    log(`Building ${label(app)}: it hasn't been built yet, so the version stays.`);
  }

  const hasProfile = rest.some(
    (arg) => arg === "--profile" || arg.startsWith("--profile=") || arg === "-e"
  );
  const status = spawn([
    "build",
    "-p",
    "android",
    ...(hasProfile ? [] : ["--profile", "test"]),
    "--local",
    ...rest,
  ]);

  if (status !== 0) {
    log(
      `The build did not finish. app.json stays at ${label(app)}, which is not recorded as built, so the next run builds it again under the same number.`
    );
    return status;
  }

  writeJson(recordPath, {
    version: app.expo.version,
    versionCode: app.expo.android.versionCode,
    builtAt: now().toISOString(),
  });
  log(
    `Built ${label(app)}. Commit app.json and last-build.json so that main matches the build on your phone:`
  );
  log(
    `  git add app.json last-build.json && git commit -m "chore: version ${app.expo.version} (versionCode ${app.expo.android.versionCode}), the build installed on the owner's phone"`
  );
  log("To give it to everyone (a GitHub release, and the version on the website): npm run publish:apk");
  return 0;
};

if (require.main === module) {
  process.exit(run({ args: process.argv.slice(2) }));
}

module.exports = { run };
