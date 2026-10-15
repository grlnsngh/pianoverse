const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { compareProjects, loadProject } = require("./appwriteSchema");

// npm run check:appwrite
//
// Compares the live Appwrite project with appwrite/project.json, what the app
// expects: every table, column, index and permission, and the photo bucket.
// Needs the Appwrite CLI, signed in (`appwrite login`). It only reads.
//
// After changing a table on purpose (and the app with it), bring the file up
// to date with:
//   appwrite pull tables --config-file appwrite/project.json --force
//   appwrite pull buckets --config-file appwrite/project.json --force

const pullCli = (args) => {
  const result = spawnSync("appwrite", args, {
    encoding: "utf8",
    // appwrite is a .ps1 or .cmd on Windows, which only a shell can start
    shell: process.platform === "win32",
  });
  if (result.error) return `Couldn't start the Appwrite CLI: ${result.error.message}`;
  if (result.status !== 0) return (result.stderr || result.stdout || "").trim() || `appwrite exited with ${result.status}`;
  return null;
};

/** Pulls the live tables and buckets into a file of their own. Returns the project, or a message. */
const pullLive = (expected, pull = pullCli) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pianoverse-appwrite-"));
  const file = path.join(dir, "appwrite.config.json");
  fs.writeFileSync(file, JSON.stringify({ projectId: expected.projectId, endpoint: expected.endpoint }));
  try {
    for (const what of ["tables", "buckets"]) {
      const failure = pull(["pull", what, "--config-file", file, "--force"]);
      if (failure) return { error: failure };
    }
    return { live: loadProject(file) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

/** Returns the exit code. `pull` runs the CLI and is only replaced in tests. */
const run = ({ expected = loadProject(), pull = pullCli, log = console.log } = {}) => {
  const { live, error } = pullLive(expected, pull);
  if (error) {
    log(`Couldn't read the live project. Is the Appwrite CLI signed in (appwrite login)?\n${error}`);
    return 2;
  }
  const differences = compareProjects(expected, live);
  if (differences.length === 0) {
    log(`Appwrite matches appwrite/project.json: ${expected.tables.length} tables and ${expected.buckets.length} bucket.`);
    return 0;
  }
  log(`Appwrite differs from what the app expects (appwrite/project.json), ${differences.length} difference${differences.length === 1 ? "" : "s"}:`);
  for (const difference of differences) log(`  - ${difference}`);
  return 1;
};

if (require.main === module) {
  process.exit(run());
}

module.exports = { pullLive, run };
