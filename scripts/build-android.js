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
// A release made right after a test build of the same code keeps the test
// build's number, so the website says the version that was tried: the record
// says which kind of build it was and from which commit, and the release
// checks with git that nothing but app.json and last-build.json changed since.
//
//   npm run build:android                  bump if needed, then build
//   npm run build:android -- --bump        bump even if it isn't needed
//   npm run build:android -- --no-bump     build with the version as it is
//   npm run build:android -- --profile production   anything else goes to eas

/**
 * git, run in the project; its status and what it printed. Line endings are
 * read the Windows way (core.autocrlf) even in WSL, where the builds run on
 * the Windows checkout: without it git there sees every file as changed.
 */
const runGit = (root) => (args) => {
  const result = spawnSync("git", ["-c", "core.autocrlf=true", ...args], { cwd: root, encoding: "utf8" });
  return { status: result.status ?? 1, stdout: (result.stdout ?? "").trim() };
};

/** The two files a build itself changes, which don't count as a change to the app. */
const VERSION_FILES = [":(exclude)app.json", ":(exclude)last-build.json"];

/** The profile eas is asked to build: the one given, or the full test build. */
const profileOf = (args) => {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--profile" || args[i] === "-e") return args[i + 1];
    if (args[i].startsWith("--profile=")) return args[i].slice("--profile=".length);
  }
  return "test";
};

/** Where the code being built stands: its commit, and whether anything besides the version files was changed on top. */
const codeState = (git) => {
  const head = git(["rev-parse", "HEAD"]);
  if (head.status !== 0 || !head.stdout) return { commit: null, dirty: true };
  const changes = git(["status", "--porcelain", "--", ".", ...VERSION_FILES]);
  return { commit: head.stdout, dirty: changes.status !== 0 || changes.stdout !== "" };
};

/**
 * Whether this release can keep the number of the test build before it: the
 * last build was a test build of this very version, made from a clean commit,
 * and nothing but the version files has changed since (committed or not).
 */
const sameAsTested = (app, record, profile, git) =>
  profile === "preview" &&
  !!record &&
  record.profile === "test" &&
  record.versionCode === app.expo.android.versionCode &&
  typeof record.commit === "string" &&
  record.dirty === false &&
  git(["diff", "--quiet", record.commit, "--", ".", ...VERSION_FILES]).status === 0;

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
  git = runGit(root),
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
  const profile = profileOf(rest);
  const code = codeState(git);

  if (skip) {
    log(`Building ${label(app)} as it is (--no-bump).`);
  } else if (!force && sameAsTested(app, record, profile, git)) {
    log(`Building ${label(app)} for the website: the same code was tried as the test build, so it keeps that number.`);
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
    // Which kind of build, from which code: a release of the same code keeps the number
    profile,
    commit: code.commit,
    dirty: code.dirty,
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

module.exports = { run, profileOf };
