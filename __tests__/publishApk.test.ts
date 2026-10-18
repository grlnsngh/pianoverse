import fs from "fs";
import os from "os";
import path from "path";

/* eslint-disable @typescript-eslint/no-var-requires */
const { run, applyRelease, formatDate, formatSize, newestApk } = require("../scripts/publish-apk");
const { wslPath } = require("../scripts/release-android");
/* eslint-enable @typescript-eslint/no-var-requires */

/**
 * `npm run publish:apk`: the newest APK goes up as the version's GitHub
 * release, and the website's version, size and date follow it onto main.
 * gh and git are replaced by a stand-in that records what it was asked.
 */

let dir = "";
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-apk-"));
  fs.mkdirSync(path.join(dir, "web"));
  fs.writeFileSync(
    path.join(dir, "app.json"),
    JSON.stringify({ expo: { version: "1.1.21", android: { package: "com.grlnsngh.pianoverse", versionCode: 32 } } }, null, 2) + "\n"
  );
  fs.writeFileSync(path.join(dir, "last-build.json"), JSON.stringify({ version: "1.1.21", versionCode: 32, builtAt: "2026-10-20T08:00:00.000Z" }));
  fs.writeFileSync(path.join(dir, "web", "release.json"), JSON.stringify({ version: "1.1.20" }, null, 2) + "\n");
  fs.writeFileSync(
    path.join(dir, "index.html"),
    '<p>Free. Version <span data-release="version">1.1.20</span>, <span data-release="size">147 MB</span>, for Android 7.0 or later.</p>'
  );
  fs.writeFileSync(
    path.join(dir, "download.html"),
    '<dd><span data-release="version">1.1.20</span>, <span data-release="date">17 October 2026</span></dd><dd><span data-release="size">147 MB</span>.</dd>'
  );
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const apk = (name: string, bytes: number, ageSeconds = 0) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, Buffer.alloc(bytes));
  const time = new Date(Date.now() - ageSeconds * 1000);
  fs.utimesSync(file, time, time);
  return file;
};

/** Runs the script; `answers` says what gh and git answer, by the first two words of the command. */
const publish = (args: string[] = [], answers: Record<string, number> = {}, env: Record<string, string> = {}) => {
  const calls: { command: string; args: string[] }[] = [];
  const lines: string[] = [];
  const code = run({
    args,
    root: dir,
    exec: (command: string, commandArgs: string[]) => {
      calls.push({ command, args: commandArgs });
      const key = `${command} ${commandArgs.slice(0, 2).join(" ")}`;
      // A release that doesn't exist yet, unless the test says it does
      const status = key in answers ? answers[key] : key === "gh release view" ? 1 : 0;
      return { status, stdout: "", stderr: status ? "no" : "" };
    },
    now: () => new Date(2026, 9, 20, 15, 0),
    log: (line: string) => lines.push(line),
    env,
  });
  return { code, calls, text: lines.join("\n"), read: (file: string) => fs.readFileSync(path.join(dir, file), "utf8") };
};

describe("the words on the site", () => {
  it("say the size as a phone's Files app does, and the date in words", () => {
    expect(formatSize(147367991)).toBe("147 MB");
    expect(formatSize(62_500_000)).toBe("63 MB");
    expect(formatDate("2026-10-17")).toBe("17 October 2026");
    expect(formatDate("2027-01-02")).toBe("2 January 2027");
  });

  it("fill in only the RELEASE spans, and leave the rest of the page alone", () => {
    const html = 'Version <span data-release="version">1.1.20</span> · <span data-release="size">147 MB</span> · <span data-release="other">x</span> · 1.1.20';
    expect(applyRelease(html, { version: "1.1.21", bytes: 62_000_000, date: "2026-10-20" })).toBe(
      'Version <span data-release="version">1.1.21</span> · <span data-release="size">62 MB</span> · <span data-release="other">x</span> · 1.1.20'
    );
  });
});

describe("publishing", () => {
  it("uploads the newest APK as pianoverse.apk in a new release named after the version", () => {
    apk("build-1.apk", 10, 3600);
    apk("build-2.apk", 62_000_000);

    const { code, calls, text } = publish();

    expect(code).toBe(0);
    expect(newestApk(dir)).toBe(path.join(dir, "build-2.apk"));
    const create = calls.find((call) => call.args[0] === "release" && call.args[1] === "create")!;
    expect(create.args.slice(0, 2)).toEqual(["release", "create"]);
    expect(create.args[2]).toBe("v1.1.21");
    expect(path.basename(create.args[3])).toBe("pianoverse.apk");
    expect(create.args).toEqual(expect.arrayContaining(["--title", "Pianoverse 1.1.21", "--latest"]));
    expect(text).toContain("Published v1.1.21: https://github.com/grlnsngh/pianoverse/releases/tag/v1.1.21 (62 MB)");
  });

  it("replaces the APK of a release that already exists, instead of making a second one", () => {
    apk("build-2.apk", 1000);

    const { calls, text } = publish([], { "gh release view": 0 });

    expect(calls.some((call) => call.args[0] === "release" && call.args[1] === "create")).toBe(false);
    expect(calls.find((call) => call.args[0] === "release" && call.args[1] === "upload")!.args).toContain("--clobber");
    expect(text).toContain("Updated v1.1.21");
  });

  it("writes the version, size and date into release.json and the pages", () => {
    apk("build-2.apk", 62_000_000);

    const { read } = publish(["--no-commit"]);

    expect(JSON.parse(read("web/release.json"))).toEqual({
      version: "1.1.21",
      versionCode: 32,
      tag: "v1.1.21",
      bytes: 62_000_000,
      date: "2026-10-20",
    });
    expect(read("index.html")).toContain('Version <span data-release="version">1.1.21</span>, <span data-release="size">62 MB</span>');
    expect(read("download.html")).toContain('<span data-release="date">20 October 2026</span>');
  });

  it("puts the site's change on main through a pull request it merges, with the version bump of the build", () => {
    apk("build-2.apk", 1000);

    const { code, calls, text } = publish();

    expect(code).toBe(0);
    const git = calls.filter((call) => call.command === "git").map((call) => call.args.slice(0, 2).join(" "));
    expect(git).toEqual(["switch -c", "add --", "commit -m", "push -u", "switch main", "pull --ff-only"]);
    expect(calls.find((call) => call.args[0] === "add")!.args).toEqual(
      expect.arrayContaining(["web/release.json", "index.html", "download.html", "app.json", "last-build.json"])
    );
    expect(calls.find((call) => call.args[0] === "switch" && call.args[1] === "-c")!.args[2]).toBe("release/v1.1.21");
    expect(calls.find((call) => call.args[0] === "pr" && call.args[1] === "merge")!.args).toEqual(
      expect.arrayContaining(["release/v1.1.21", "--merge", "--delete-branch"])
    );
    expect(text).toContain("Merged: the website shows the new version");
  });

  it("can leave the pull request open, or not commit at all", () => {
    apk("build-2.apk", 1000);
    expect(publish(["--no-merge"]).calls.some((call) => call.args[0] === "pr" && call.args[1] === "merge")).toBe(false);
    expect(publish(["--no-commit"]).calls.some((call) => call.command === "git")).toBe(false);
  });
});

describe("what stops it", () => {
  it("refuses a full test build, which carries the emulators' code, unless told to", () => {
    const full = apk("build-3.apk", 0);
    fs.writeFileSync(full, Buffer.concat([Buffer.alloc(500), Buffer.from("lib/x86_64/libhermes.so"), Buffer.alloc(500)]));

    const refused = publish();
    expect(refused.code).toBe(1);
    expect(refused.text).toContain("build-3.apk is a full test build");
    expect(refused.calls).toEqual([]);

    expect(publish(["--allow-full", "--no-commit"]).code).toBe(0);
  });

  it("refuses with no APK, or one that isn't of the version in app.json", () => {
    expect(publish().text).toContain("There is no APK to publish");

    apk("build-2.apk", 1000);
    fs.writeFileSync(path.join(dir, "last-build.json"), JSON.stringify({ version: "1.1.20", versionCode: 31 }));
    const stale = publish();
    expect(stale.code).toBe(1);
    expect(stale.text).toContain("The last build recorded is 1.1.20, but app.json says 1.1.21");
    expect(stale.calls).toEqual([]);
  });

  it("changes nothing on the site when the release can't be made", () => {
    apk("build-2.apk", 1000);

    const { code, read, text } = publish([], { "gh release create": 1 });

    expect(code).toBe(1);
    expect(text).toContain("The release couldn't be made");
    expect(read("web/release.json")).toContain('"version": "1.1.20"');
  });

  it("says what to do by hand when the site's pull request can't be made", () => {
    apk("build-2.apk", 1000);

    const { code, text } = publish([], { "git push -u": 1 });

    expect(code).toBe(1);
    expect(text).toContain("The release is published; put the site's changes on main by hand.");
  });
});

describe("one command for a release", () => {
  it("finds the project from WSL, which sees a Windows drive under /mnt", () => {
    expect(wslPath("D:\\Workplace\\pianoverse")).toBe("/mnt/d/Workplace/pianoverse");
  });
});

describe("run from PowerShell, which leaves out the -- after npm run", () => {
  // npm keeps --apk and --notes for itself and hands their values over as loose words
  it("publishes nothing when the flags didn't arrive, and says how to run it", () => {
    const loose = publish(["build-123.apk", "What's", "new"], {}, { npm_config_apk: "true", npm_config_notes: "true" });

    expect(loose.code).toBe(1);
    expect(loose.calls).toEqual([]);
    expect(loose.text).toContain("node scripts/publish-apk.js --apk <file>");
  });

  it("stops on loose words alone, or on npm's settings alone", () => {
    expect(publish(["build-123.apk"]).code).toBe(1);
    expect(publish([], {}, { npm_config_notes: "true" }).calls).toEqual([]);
  });

  it("still takes the flags with their values, and --allow-full", () => {
    const { text } = publish(["--notes", "What's new", "--allow-full"]);

    expect(text).not.toContain("didn't arrive");
  });
});
