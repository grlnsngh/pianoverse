const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { readJson, readJsonIfExists, writeJson } = require("./version");

// npm run publish:apk
//
// Gives the newest APK to everyone through the website: uploads it to a GitHub
// release named after the version (v1.1.21) as `pianoverse.apk`, so the site's
// download link (releases/latest/download/pianoverse.apk) gives it at once,
// then writes the version, size and date into web/release.json and the pages
// that show them (the RELEASE spans in index.html and download.html), and puts
// that on main so the live site says the same. Run on the computer where `gh`
// (the GitHub command line) is signed in. See docs/website/PLAN.md.
//
//   npm run publish:apk                          the newest build-*.apk, as app.json's version
//   npm run publish:apk -- --apk path/to/file.apk
//   npm run publish:apk -- --notes "What's new"  for the release page
//   npm run publish:apk -- --no-merge            leave the site's pull request open instead of merging it
//
// Only the small build goes on the website (the owner's rule): an APK that
// carries the emulators' x86 code is a full test build and is refused, unless
// --allow-full is given. A release is public: anyone with the link can install
// the app.

const REPO = "grlnsngh/pianoverse";
const ASSET = "pianoverse.apk";
const PAGES = ["index.html", "download.html"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "147 MB", as a phone's Files app says it (millions of bytes). */
const formatSize = (bytes) => `${Math.round(bytes / 1e6)} MB`;

/** "17 October 2026" from "2026-10-17". */
const formatDate = (day) => {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** The words each RELEASE span on the pages shows. */
const releaseWords = (release) => ({
  version: release.version,
  size: formatSize(release.bytes),
  date: formatDate(release.date),
});

/** The page with every `<span data-release="…">` filled in from the release. */
const applyRelease = (html, release) => {
  const words = releaseWords(release);
  return html.replace(/(<span data-release="(\w+)">)[^<]*(<\/span>)/g, (whole, open, key, close) =>
    key in words ? `${open}${words[key]}${close}` : whole
  );
};

/** The newest `build-*.apk` in the folder (what `npm run build:android` leaves), or null. */
const newestApk = (root) => {
  const apks = fs
    .readdirSync(root)
    .filter((name) => /^build-.*\.apk$/.test(name))
    .map((name) => ({ name, time: fs.statSync(path.join(root, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  return apks.length ? path.join(root, apks[0].name) : null;
};

/**
 * Whether the APK is a full test build: it carries code for x86 processors,
 * which only emulators have. File names in an APK (a zip) are stored as plain
 * text, so they can be found in its bytes.
 */
const isFullBuild = (file) => {
  const bytes = fs.readFileSync(file);
  return bytes.includes(Buffer.from("lib/x86_64/")) || bytes.includes(Buffer.from("lib/x86/"));
};

/** A day as YYYY-MM-DD in the computer's own time zone. */
const localDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const runCommand = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false, ...options });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
};

/**
 * Publishes the APK and the site. Returns the exit code. `exec(command, args)`
 * runs gh, git and npx, and is only replaced in tests.
 */
/** The flags that are followed by a value. */
const VALUE_FLAGS = ["--apk", "--notes"];

const run = ({
  args,
  root = path.join(__dirname, ".."),
  exec = runCommand,
  now = () => new Date(),
  log = console.log,
  env = process.env,
}) => {
  const value = (flag) => {
    const at = args.indexOf(flag);
    return at > -1 ? args[at + 1] : undefined;
  };
  // PowerShell drops the `--` in `npm run publish:apk -- --notes "..."`, so npm keeps
  // --apk and --notes as its own settings and hands their values over as loose words.
  // Publishing then would lose the notes, or pick the newest APK instead of the one
  // named, so it stops and says how to run it.
  const loose = args.filter((arg, i) => !arg.startsWith("--") && !VALUE_FLAGS.includes(args[i - 1]));
  if (loose.length > 0 || env.npm_config_apk !== undefined || env.npm_config_notes !== undefined) {
    log(
      "Nothing was published: the --apk or --notes didn't arrive (PowerShell leaves out the `--` after npm run).\n" +
        'Run it as: node scripts/publish-apk.js --apk <file> --notes "What\'s new"'
    );
    return 1;
  }
  const app = readJson(path.join(root, "app.json"));
  const version = app.expo.version;
  const versionCode = app.expo.android.versionCode;
  const tag = `v${version}`;

  const apk = value("--apk") ? path.resolve(root, value("--apk")) : newestApk(root);
  if (!apk || !fs.existsSync(apk)) {
    log("There is no APK to publish. Build one first: npm run build:android");
    return 1;
  }
  if (isFullBuild(apk) && !args.includes("--allow-full")) {
    log(
      `${path.basename(apk)} is a full test build (it carries the emulators' x86 code), and the website gets the small one. Make it with: npm run release:android (or npm run build:android -- --profile preview).`
    );
    return 1;
  }
  const record = readJsonIfExists(path.join(root, "last-build.json"));
  if (!value("--apk") && (!record || record.version !== version)) {
    log(
      `The last build recorded is ${record ? record.version : "none"}, but app.json says ${version}. Build ${version} first, or name the file with --apk.`
    );
    return 1;
  }

  // The file goes up as pianoverse.apk, whatever it was called here
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "pianoverse-release-"));
  const upload = path.join(folder, ASSET);
  fs.copyFileSync(apk, upload);
  const bytes = fs.statSync(upload).size;

  const notes =
    value("--notes") ??
    `Pianoverse for Android, version ${version} (versionCode ${versionCode}). Free. Needs Android 7.0 or later.\n\nHow to install it, step by step: https://grlnsngh.github.io/pianoverse/download.html`;
  const exists = exec("gh", ["release", "view", tag, "--repo", REPO]).status === 0;
  const uploaded = exists
    ? exec("gh", ["release", "upload", tag, upload, "--clobber", "--repo", REPO])
    : exec("gh", ["release", "create", tag, upload, "--repo", REPO, "--title", `Pianoverse ${version}`, "--notes", notes, "--latest"]);
  fs.rmSync(folder, { recursive: true, force: true });
  if (uploaded.status !== 0) {
    log(`The release couldn't be ${exists ? "updated" : "made"}: ${(uploaded.stderr || uploaded.stdout).trim()}`);
    return 1;
  }
  log(`${exists ? "Updated" : "Published"} ${tag}: https://github.com/${REPO}/releases/tag/${tag} (${formatSize(bytes)})`);

  // The site: release.json and the words on the pages
  const release = { version, versionCode, tag, bytes, date: localDay(now()) };
  writeJson(path.join(root, "web", "release.json"), release);
  for (const page of PAGES) {
    const file = path.join(root, page);
    fs.writeFileSync(file, applyRelease(fs.readFileSync(file, "utf8"), release));
  }
  log(`The site now says version ${version}, ${formatSize(bytes)}, ${formatDate(release.date)}.`);

  if (args.includes("--no-commit")) return 0;

  // Onto main, through a pull request, so the live site changes with it
  const files = ["web/release.json", ...PAGES, "app.json", "last-build.json"];
  const branch = `release/${tag}`;
  const git = (...gitArgs) => exec("git", gitArgs, { cwd: root });
  const steps = [
    () => git("switch", "-c", branch),
    () => git("add", "--", ...files),
    () =>
      git(
        "commit",
        "-m",
        `chore: publish ${version} (versionCode ${versionCode}) on the website\n\nThe APK is the ${tag} release's ${ASSET}; the site's version, size and date are from web/release.json.`
      ),
    () => git("push", "-u", "origin", branch),
    () =>
      exec(
        "gh",
        ["pr", "create", "--repo", REPO, "--base", "main", "--head", branch, "--title", `chore: publish ${version} on the website`, "--body", `Uploaded ${ASSET} to the ${tag} release (${formatSize(bytes)}) and wrote its version, size and date on the site.\n\nMade by \`npm run publish:apk\`.`],
        { cwd: root }
      ),
  ];
  for (const step of steps) {
    const result = step();
    if (result.status !== 0) {
      log(`Stopped: ${(result.stderr || result.stdout).trim()}\nThe release is published; put the site's changes on main by hand.`);
      return 1;
    }
  }
  if (args.includes("--no-merge")) {
    log(`The site's pull request is open on ${branch}. Merge it to put the new version on the website.`);
    return 0;
  }
  const merged = exec("gh", ["pr", "merge", branch, "--repo", REPO, "--merge", "--delete-branch"], { cwd: root });
  if (merged.status !== 0) {
    log(`The pull request couldn't be merged: ${(merged.stderr || merged.stdout).trim()}\nMerge it on GitHub to update the site.`);
    return 1;
  }
  git("switch", "main");
  git("pull", "--ff-only");
  log("Merged: the website shows the new version in a minute or two, once GitHub Pages has rebuilt.");
  return 0;
};

if (require.main === module) {
  process.exit(run({ args: process.argv.slice(2) }));
}

module.exports = { run, applyRelease, formatDate, formatSize, isFullBuild, newestApk, releaseWords };
