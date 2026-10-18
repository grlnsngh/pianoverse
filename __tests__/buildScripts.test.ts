import fs from "fs";
import os from "os";
import path from "path";

/* eslint-disable @typescript-eslint/no-var-requires */
const { bumpVersion, bumped, needsBump, writeJson } = require("../scripts/version");
const { run, profileOf } = require("../scripts/build-android");
/* eslint-enable @typescript-eslint/no-var-requires */

/**
 * `npm run build:android`: raises the version only when the last build used the
 * number, builds, and records the build. The version helpers behind it are
 * `npm run plus`'s too. eas is replaced by a stand-in that says how the build went.
 */

const app = (version = "1.1.17", versionCode = 28) => ({
  expo: {
    name: "pianoverse",
    version,
    scheme: ["pianoverse"],
    android: { package: "com.grlnsngh.pianoverse", versionCode },
    runtimeVersion: "3",
  },
});

let dir = "";
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "build-android-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const appFile = () => path.join(dir, "app.json");
const recordFile = () => path.join(dir, "last-build.json");
const readApp = () => JSON.parse(fs.readFileSync(appFile(), "utf8"));
const readRecord = () => JSON.parse(fs.readFileSync(recordFile(), "utf8"));
const setUp = (appJson: unknown, record?: unknown) => {
  fs.writeFileSync(appFile(), JSON.stringify(appJson, null, 2) + "\n");
  if (record !== undefined) fs.writeFileSync(recordFile(), JSON.stringify(record));
};

/**
 * git as the build script sees it: a clean checkout at `commit`, where `changed`
 * says whether anything but the version files differs from a recorded commit.
 */
const fakeGit = ({ commit = "abc123", dirty = false, changed = false } = {}) => (gitArgs: string[]) => {
  if (gitArgs[0] === "rev-parse") return { status: 0, stdout: commit };
  if (gitArgs[0] === "status") return { status: 0, stdout: dirty ? " M utils/money.ts" : "" };
  if (gitArgs[0] === "diff") return { status: changed ? 1 : 0, stdout: "" };
  return { status: 1, stdout: "" };
};

/** Runs the script in the temp folder; eas answers with `status` and its arguments are kept. */
const build = (args: string[] = [], status = 0, git?: ReturnType<typeof fakeGit>) => {
  const calls: string[][] = [];
  const lines: string[] = [];
  const code = run({
    args,
    root: dir,
    ...(git ? { git } : {}),
    spawn: (easArgs: string[]) => {
      calls.push(easArgs);
      return status;
    },
    now: () => new Date("2026-10-02T09:30:00.000Z"),
    log: (line: string) => lines.push(line),
  });
  return { code, calls, text: lines.join("\n") };
};

describe("raising the version", () => {
  it("raises the last part of the version by one", () => {
    expect(bumpVersion("1.1.9")).toBe("1.1.10");
    expect(bumpVersion("1.1.17")).toBe("1.1.18");
    expect(bumpVersion("2.0.0")).toBe("2.0.1");
    expect(bumpVersion("3")).toBe("4");
  });

  it("starts from 0 when the last part isn't a number", () => {
    expect(bumpVersion("1.1.beta")).toBe("1.1.1");
  });

  it("raises the version and the versionCode and leaves the rest of app.json alone", () => {
    const before = app("1.1.17", 28);

    const after = bumped(before);

    expect(after.expo.version).toBe("1.1.18");
    expect(after.expo.android.versionCode).toBe(29);
    expect(after.expo.android.package).toBe("com.grlnsngh.pianoverse");
    expect(after.expo.scheme).toEqual(["pianoverse"]);
    expect(after.expo.runtimeVersion).toBe("3");
  });

  it("doesn't change what it was given", () => {
    const before = app("1.1.17", 28);

    bumped(before);

    expect(before).toEqual(app("1.1.17", 28));
  });
});

describe("when a build needs a new version", () => {
  it("is when this versionCode was already built, or a higher one", () => {
    expect(needsBump(app("1.1.17", 28), { versionCode: 28 })).toBe(true);
    expect(needsBump(app("1.1.17", 28), { versionCode: 30 })).toBe(true);
  });

  it("is not when the versionCode is higher than the last build's", () => {
    expect(needsBump(app("1.1.17", 28), { versionCode: 26 })).toBe(false);
  });

  it("is when there is no record to say, to be safe", () => {
    expect(needsBump(app(), null)).toBe(true);
    expect(needsBump(app(), {})).toBe(true);
    expect(needsBump(app(), { versionCode: "28" })).toBe(true);
  });
});

describe("writing app.json", () => {
  it("keeps two spaces, the line endings and the final newline it had", () => {
    for (const eol of ["\n", "\r\n"]) {
      const file = path.join(dir, "keep.json");
      fs.writeFileSync(file, `{${eol}  "a": 1${eol}}${eol}`);

      writeJson(file, { a: 2, b: { c: 3 } });

      expect(fs.readFileSync(file, "utf8")).toBe(
        ["{", '  "a": 2,', '  "b": {', '    "c": 3', "  }", "}"].join(eol) + eol
      );
    }
  });

  it("leaves out the final newline when the file had none, and adds one to a new file", () => {
    const old = path.join(dir, "old.json");
    fs.writeFileSync(old, '{"a":1}');
    writeJson(old, { a: 2 });
    expect(fs.readFileSync(old, "utf8")).toBe('{\n  "a": 2\n}');

    const fresh = path.join(dir, "fresh.json");
    writeJson(fresh, { a: 1 });
    expect(fs.readFileSync(fresh, "utf8")).toBe('{\n  "a": 1\n}\n');
  });
});

describe("npm run build:android", () => {
  it("builds with the version as it is when it hasn't been built yet", () => {
    setUp(app("1.1.17", 28), { version: "1.1.15", versionCode: 26, builtAt: null });

    const { code, calls, text } = build();

    expect(code).toBe(0);
    expect(readApp().expo).toMatchObject({ version: "1.1.17", android: { versionCode: 28 } });
    expect(calls).toEqual([["build", "-p", "android", "--profile", "test", "--local"]]);
    expect(text).toContain("Building 1.1.17 (versionCode 28): it hasn't been built yet, so the version stays.");
  });

  it("raises the version first when this one was already built", () => {
    setUp(app("1.1.17", 28), { version: "1.1.17", versionCode: 28, builtAt: null });

    const { code, text } = build();

    expect(code).toBe(0);
    expect(readApp().expo).toMatchObject({ version: "1.1.18", android: { versionCode: 29 } });
    expect(text).toContain(
      "The version goes up, because 1.1.17 (versionCode 28) was already built: 1.1.17 (versionCode 28) -> 1.1.18 (versionCode 29)."
    );
  });

  it("raises it when there is no record of an earlier build", () => {
    setUp(app("1.1.17", 28));

    const { text } = build();

    expect(readApp().expo.version).toBe("1.1.18");
    expect(text).toContain("there is no record of an earlier build");
  });

  it("records what was built, and when, once the build works", () => {
    setUp(app("1.1.17", 28), { version: "1.1.15", versionCode: 26, builtAt: null });

    build([], 0, fakeGit({ commit: "abc123" }));

    expect(readRecord()).toEqual({
      version: "1.1.17",
      versionCode: 28,
      builtAt: "2026-10-02T09:30:00.000Z",
      // The full test build, from a clean commit
      profile: "test",
      commit: "abc123",
      dirty: false,
    });
  });

  it("records the raised version, so the next build raises it again", () => {
    setUp(app("1.1.17", 28), { version: "1.1.17", versionCode: 28, builtAt: null });

    build();
    expect(readRecord()).toMatchObject({ version: "1.1.18", versionCode: 29 });

    build();
    expect(readApp().expo).toMatchObject({ version: "1.1.19", android: { versionCode: 30 } });
    expect(readRecord()).toMatchObject({ version: "1.1.19", versionCode: 30 });
  });

  it("tells what to commit when the build works", () => {
    setUp(app("1.1.17", 28), { versionCode: 26 });

    const { text } = build();

    expect(text).toContain("Built 1.1.17 (versionCode 28).");
    expect(text).toContain(
      `git add app.json last-build.json && git commit -m "chore: version 1.1.17 (versionCode 28), the build installed on the owner's phone"`
    );
  });

  describe("when the build fails", () => {
    it("passes on eas's exit code and doesn't record the build", () => {
      setUp(app("1.1.17", 28), { version: "1.1.15", versionCode: 26, builtAt: null });

      const { code, text } = build([], 2);

      expect(code).toBe(2);
      expect(readRecord()).toEqual({ version: "1.1.15", versionCode: 26, builtAt: null });
      expect(text).toContain("The build did not finish.");
    });

    it("keeps the raised number, so the next run builds the same one instead of skipping another", () => {
      setUp(app("1.1.17", 28), { version: "1.1.17", versionCode: 28, builtAt: null });

      build([], 1);
      expect(readApp().expo.android.versionCode).toBe(29);

      const second = build();
      expect(second.code).toBe(0);
      expect(readApp().expo).toMatchObject({ version: "1.1.18", android: { versionCode: 29 } });
      expect(readRecord().versionCode).toBe(29);
    });

    it("writes no record when there was none to start with", () => {
      setUp(app());

      build([], 1);

      expect(fs.existsSync(recordFile())).toBe(false);
    });
  });

  describe("options", () => {
    it("--bump raises the version even when it isn't needed", () => {
      setUp(app("1.1.17", 28), { versionCode: 26 });

      const { text } = build(["--bump"]);

      expect(readApp().expo).toMatchObject({ version: "1.1.18", android: { versionCode: 29 } });
      expect(text).toContain("--bump was given");
    });

    it("--no-bump keeps the version even when it was already built", () => {
      setUp(app("1.1.17", 28), { versionCode: 28 });

      const { calls, text } = build(["--no-bump"]);

      expect(readApp().expo).toMatchObject({ version: "1.1.17", android: { versionCode: 28 } });
      expect(text).toContain("as it is (--no-bump)");
      expect(calls[0]).not.toContain("--no-bump");
    });

    it("won't take both", () => {
      setUp(app("1.1.17", 28), { versionCode: 26 });

      const { code, calls, text } = build(["--bump", "--no-bump"]);

      expect(code).toBe(1);
      expect(calls).toEqual([]);
      expect(text).toContain("not both");
      expect(readApp().expo.android.versionCode).toBe(28);
    });

    it("passes any other argument on to eas, and doesn't pass the two it reads", () => {
      setUp(app("1.1.17", 28), { versionCode: 26 });

      const { calls } = build(["--bump", "--clear-cache"]);

      expect(calls).toEqual([
        ["build", "-p", "android", "--profile", "test", "--local", "--clear-cache"],
      ]);
    });

    it("builds the profile it is given instead of the full test build", () => {
      for (const given of [["--profile", "production"], ["--profile=production"], ["-e", "production"]]) {
        setUp(app("1.1.17", 28), { versionCode: 26 });

        const { calls } = build(given);

        expect(calls[0]).toEqual(["build", "-p", "android", "--local", ...given]);
      }
    });
  });

  it("leaves app.json's other settings as they were", () => {
    setUp(app("1.1.17", 28), { versionCode: 28 });

    build();

    const after = readApp().expo;
    expect(after.scheme).toEqual(["pianoverse"]);
    expect(after.runtimeVersion).toBe("3");
    expect(after.android.package).toBe("com.grlnsngh.pianoverse");
  });
});

describe("the project's own files", () => {
  const root = path.join(__dirname, "..");
  const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

  it("has the commands", () => {
    const { scripts } = readJson("package.json");

    expect(scripts.plus).toBe("node ./scripts/increment-version.js");
    expect(scripts["build:android"]).toBe("node ./scripts/build-android.js");
  });

  it("has a record of the last build that app.json's versionCode has been built or is ahead of", () => {
    const record = readJson("last-build.json");
    const { expo } = readJson("app.json");

    expect(typeof record.versionCode).toBe("number");
    expect(typeof record.version).toBe("string");
    // The record never gets ahead of app.json: a build raises app.json first
    expect(record.versionCode).toBeLessThanOrEqual(expo.android.versionCode);
  });
});

describe("a release right after a test build (the same number on the website)", () => {
  const tested = { version: "1.1.21", versionCode: 32, builtAt: null, profile: "test", commit: "abc123", dirty: false };

  it("keeps the test build's number when nothing but the version files changed since", () => {
    setUp(app("1.1.21", 32), tested);

    const { calls, text } = build(["--profile", "preview"], 0, fakeGit({ commit: "def456" }));

    expect(readApp().expo).toMatchObject({ version: "1.1.21", android: { versionCode: 32 } });
    expect(text).toContain("Building 1.1.21 (versionCode 32) for the website: the same code was tried as the test build");
    expect(calls).toEqual([["build", "-p", "android", "--local", "--profile", "preview"]]);
    expect(readRecord()).toMatchObject({ versionCode: 32, profile: "preview" });
  });

  it("raises it when the code changed since the test build", () => {
    setUp(app("1.1.21", 32), tested);

    build(["--profile", "preview"], 0, fakeGit({ changed: true }));

    expect(readApp().expo.android.versionCode).toBe(33);
  });

  it("raises it when the test build was made with changes that weren't committed, since what it held can't be told", () => {
    setUp(app("1.1.21", 32), { ...tested, dirty: true });

    build(["--profile", "preview"], 0, fakeGit());

    expect(readApp().expo.android.versionCode).toBe(33);
  });

  it("raises it after a release, after another test build, and when --bump is given", () => {
    setUp(app("1.1.21", 32), { ...tested, profile: "preview" });
    build(["--profile", "preview"], 0, fakeGit());
    expect(readApp().expo.android.versionCode).toBe(33);

    setUp(app("1.1.21", 32), tested);
    build([], 0, fakeGit());
    expect(readApp().expo.android.versionCode).toBe(33);

    setUp(app("1.1.21", 32), tested);
    build(["--profile", "preview", "--bump"], 0, fakeGit());
    expect(readApp().expo.android.versionCode).toBe(33);
  });

  it("knows which profile it builds", () => {
    expect(profileOf([])).toBe("test");
    expect(profileOf(["--profile", "preview"])).toBe("preview");
    expect(profileOf(["--profile=production"])).toBe("production");
    expect(profileOf(["-e", "preview", "--non-interactive"])).toBe("preview");
  });
});
