import fs from "fs";
import path from "path";
import {
  CONTACT_EMAIL,
  DELETE_ACCOUNT_URL,
  PRIVACY_POLICY_URL,
  RESET_PASSWORD_URL,
  SITE_URL,
} from "@/constants/links";
import { lightColors as colors, motion } from "@/constants/theme";

/**
 * The pages that open in a browser (the landing page, the download page, the
 * reset page, the privacy policy and the delete-account page, served by
 * GitHub Pages) look like the app: same colours, same motion, and only files
 * that exist. docs/redesign/WEB.md lists them; docs/website/PLAN.md is the
 * 2026 rebuild of the landing and download pages.
 */

const root = path.join(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const PAGES = ["index.html", "download.html", "reset-password.html", "privacy.html", "delete-account.html"];
/** The 2026 pages, built for big text from the start */
const SITE_PAGES = ["index.html", "download.html"];
const css = read("web/site.css");

const cssVariables = () => {
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  return Object.fromEntries(
    [...block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [
      m[1],
      m[2].replace(/\s+/g, " ").trim(),
    ])
  );
};

describe("the colours of the web pages", () => {
  // CSS name -> the app's token
  const SAME_AS_APP: Record<string, keyof typeof colors> = {
    ink: "ink",
    "ink-2": "ink2",
    brand: "brand",
    "brand-pressed": "brandPressed",
    "brand-text": "brandText",
    late: "late",
    "late-tint": "lateTint",
    "late-tint-text": "lateTintText",
    page: "page",
    grouped: "grouped",
    fill: "fill",
    "fill-pressed": "fillPressed",
    hairline: "hairline",
    "input-border": "inputBorder",
    "disabled-text": "disabledText",
  };

  it("are the app's, token for token", () => {
    const variables = cssVariables();
    for (const [name, token] of Object.entries(SAME_AS_APP)) {
      expect(variables[name]?.toLowerCase()).toBe(colors[token].toLowerCase());
    }
  });

  it("only use colours from the app, nothing else, in the stylesheet", () => {
    const allowed = new Set(
      Object.values(colors).map((value) => value.toLowerCase())
    );
    const used = [...css.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) =>
      m[0].toLowerCase()
    );
    expect(used.filter((value) => !allowed.has(value))).toEqual([]);
  });

  it("uses the same font as the app, with system fonts as a fallback", () => {
    expect(cssVariables().font).toMatch(/^"Figtree", -apple-system/);
    for (const page of PAGES) {
      expect(read(page)).toContain("family=Figtree:wght@400;500;600;700");
    }
  });
});

describe("the motion of the web pages", () => {
  const ms = (value: number) => new RegExp(`\\b${value}ms\\b`);

  it("uses the app's durations", () => {
    expect(css).toMatch(ms(motion.duration.press));
    expect(css).toMatch(ms(motion.duration.addStep));
    expect(css).toMatch(ms(motion.duration.checkPop));
    expect(css).toMatch(ms(motion.duration.checkDraw));
    expect(css).toMatch(ms(motion.duration.spinnerTurn));
    expect(css).toMatch(ms(motion.duration.reducedFade));
  });

  it("uses the app's easing and its 24 px slide and pressed scale", () => {
    const [a, b, c, d] = motion.easing.standard;
    expect(css).toContain(`cubic-bezier(${a}, ${b}, ${c}, ${d})`);
    expect(css).toContain(`translateY(${motion.addStepOffset}px)`);
    expect(css).toContain(`scale(${motion.pressedScale})`);
  });

  it("only fades when the phone or computer asks for less motion", () => {
    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(reduced).toContain("fade-in");
    expect(reduced).not.toContain("translateY");
    expect(reduced).toMatch(/\.status \.check\s*\{\s*animation: none/);
    expect(reduced).toMatch(/\.spinner\s*\{\s*animation: none/);
  });
});

describe("the web pages", () => {
  it.each(PAGES)("%s only points at files that exist", (page) => {
    const html = read(page);
    const references = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1].split("#")[0])
      .filter((value) => value && !/^(https?:|mailto:|pianoverse:|\.\/$)/.test(value));
    // Each picture in a srcset too
    for (const set of html.matchAll(/\bsrcset="([^"]+)"/g)) {
      references.push(...set[1].split(",").map((part) => part.trim().split(/\s+/)[0]));
    }

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(fs.existsSync(path.join(root, reference))).toBe(true);
    }
  });

  it.each(PAGES)(
    "%s has no inline styles or scripts, so the Content-Security-Policy can forbid them",
    (page) => {
      const html = read(page);
      expect(html).not.toMatch(/\sstyle=/);
      expect(html).not.toMatch(/<style[\s>]/);
      expect(html).not.toMatch(/\son[a-z]+=/i);
      for (const script of html.matchAll(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/g
      )) {
        expect(script[1]).toContain("src=");
        expect(script[2].trim()).toBe("");
      }
      expect(html).toContain("Content-Security-Policy");
      expect(html).not.toContain("unsafe-inline");
    }
  );

  it("the reset page never passes its link on to another site", () => {
    const html = read("reset-password.html");
    expect(html).toContain('<meta name="referrer" content="no-referrer">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    // Without JavaScript the form must not be able to send the passwords anywhere
    expect(html).toContain("form-action 'none'");
    expect(html).toMatch(/<form[^>]*method="post"/);
  });

  it("the reset page can only reach the Appwrite the app uses", () => {
    const appwrite = read("lib/appwrite.ts");
    const endpoint = appwrite.match(/endpoint:\s*"([^"]+)"/)?.[1] ?? "";
    const project = appwrite.match(/projectId:\s*"([^"]+)"/)?.[1] ?? "";
    const logic = read("web/reset-logic.js");

    expect(logic).toContain(`var ENDPOINT = "${endpoint}"`);
    expect(logic).toContain(`var PROJECT = "${project}"`);
    expect(read("reset-password.html")).toContain(
      `connect-src ${new URL(endpoint).origin}`
    );
  });

  it("the link the app puts in the reset email opens the reset page", () => {
    expect(read("lib/appwrite.ts")).toContain("createRecovery({ email, url: RESET_PASSWORD_URL })");
    const file = path.basename(new URL(RESET_PASSWORD_URL).pathname);
    expect(file).toBe("reset-password.html");
    expect(fs.existsSync(path.join(root, file))).toBe(true);
  });

  it("the privacy policy and delete-account addresses the app and Google Play give are pages here", () => {
    for (const [url, file] of [
      [PRIVACY_POLICY_URL, "privacy.html"],
      [DELETE_ACCOUNT_URL, "delete-account.html"],
    ]) {
      expect(url.startsWith(SITE_URL)).toBe(true);
      expect(path.basename(new URL(url).pathname)).toBe(file);
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
  });

  it.each(PAGES)("%s gives the contact address the app uses, and no other", (page) => {
    const html = read(page);
    expect(html).toContain(`mailto:${CONTACT_EMAIL}`);
    const addresses = [...html.matchAll(/mailto:([^"?]+)/g)].map((m) => m[1]);
    expect(new Set(addresses)).toEqual(new Set([CONTACT_EMAIL]));
  });

  it("the privacy policy names who runs the app, and says how to delete the account", () => {
    const html = read("privacy.html");
    expect(html).toContain("Gurleen Singh");
    expect(html).toContain('href="delete-account.html"');
    expect(html).toContain("Account, Delete account");
    expect(html).toMatch(/Updated \d{1,2} [A-Z][a-z]+ \d{4}/);
  });

  it("the delete-account page gives the steps in the app, and asks by email from the account's address", () => {
    const html = read("delete-account.html");
    expect(html).toContain("Choose Delete account");
    expect(html).toContain("It is under Privacy");
    expect(html).toContain(`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20Pianoverse%20account`);
    expect(html).toContain("from the email address of your account");
    expect(html).toContain('href="privacy.html"');
  });

  it("the home page leads to the privacy policy and to deleting an account", () => {
    const html = read("index.html");
    expect(html).toContain('href="privacy.html"');
    expect(html).toContain('href="delete-account.html"');
  });

  it("the buttons that open the app lead to screens that exist", () => {
    const schemeLinks = PAGES.flatMap((page) =>
      [...read(page).matchAll(/href="pianoverse:\/\/([^"]+)"/g)].map(
        (m) => m[1]
      )
    );

    expect(schemeLinks.sort()).toEqual(["forget-password", "sign-in"]);
    for (const screen of schemeLinks) {
      expect(
        fs.existsSync(path.join(root, "app", "(auth)", `${screen}.tsx`))
      ).toBe(true);
    }
  });

  it("has a mark for the page icon and for the email (a real 192 px PNG, since emails can't use SVG)", () => {
    const png = fs.readFileSync(path.join(root, "web/mark.png"));
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(192);
    expect(png.readUInt32BE(20)).toBe(192);
    expect(read("web/mark.svg")).toContain(colors.ink.toUpperCase());
  });

  it("names its pages for the people who read them: a title, a language and a description", () => {
    for (const page of PAGES) {
      const html = read(page);
      expect(html).toMatch(/<html lang="en">/);
      expect(html).toMatch(/<title>[^<]*Pianoverse[^<]*<\/title>/);
      expect(html).toMatch(/<meta name="description" content="[^"]{20,}">/);
      expect(html).toContain('name="viewport"');
    }
  });
});

describe("the landing and download pages (docs/website/PLAN.md)", () => {
  /** The part of the stylesheet written for them, from 2026 */
  const siteCss = css.slice(css.indexOf("The site: the landing page and the download page"));

  it("never stop a person from zooming in", () => {
    for (const page of PAGES) {
      const viewport = read(page).match(/<meta name="viewport" content="([^"]+)">/)?.[1] ?? "";
      expect(viewport).toContain("width=device-width");
      expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)|maximum-scale/);
    }
  });

  it("ask Chrome on Android to follow the phone's Font size, and leave the root text size to the browser", () => {
    for (const page of SITE_PAGES) expect(read(page)).toContain('<meta name="text-scale" content="scale">');
    // A fixed size on the root would stop every rem from growing
    expect(css).not.toMatch(/(^|\n)html\s*\{[^}]*font-size:\s*\d+px/);
    expect(css).toMatch(/body\s*\{[^}]*font-size:\s*1rem/);
  });

  it("size their words, spaces and boxes in rem, with no fixed height on anything that holds text", () => {
    // 1px borders are fine; nothing else in the site's part is in px
    const px = [...siteCss.matchAll(/([a-z-]+):[^;{}]*\b(\d+(?:\.\d+)?)px/g)]
      .filter((m) => !/^border/.test(m[1]))
      .map((m) => m[0]);
    expect(px).toEqual([]);
    // A fixed height only on pictures (the logo, the screenshots), which hold no words
    const fixed = [...siteCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((rule) => /(^|[\s;])height:\s*\d/.test(rule[2]) && !/brand-mark|\.shot/.test(rule[1]))
      .map((rule) => rule[1].trim());
    expect(fixed).toEqual([]);
  });

  it("fall back to one column when there is no room at the text size in use (container queries in rem)", () => {
    for (const box of [".intro", ".what", ".pair", ".faq", ".dl"]) {
      expect(siteCss).toMatch(new RegExp(`\\${box} \\{[^}]*container-type: inline-size`));
    }
    expect(siteCss).toMatch(/@container \(min-width: \d+rem\)/);
  });

  it("give every picture words for a screen reader (or mark it as decoration) and its size", () => {
    for (const page of SITE_PAGES) {
      for (const img of read(page).matchAll(/<img\b[^>]*>/g)) {
        expect(img[0]).toMatch(/\balt="[^"]*"/);
        expect(img[0]).toMatch(/\bwidth="\d+"/);
        expect(img[0]).toMatch(/\bheight="\d+"/);
      }
    }
    // Every screenshot says what it shows
    const shots = [...read("index.html").matchAll(/<img src="web\/screens\/[^"]+"[^>]*alt="([^"]*)"/g)];
    expect(shots.length).toBeGreaterThanOrEqual(10);
    for (const shot of shots) expect(shot[1].length).toBeGreaterThan(30);
  });

  it("lead to the download page, which gives the newest APK from GitHub Releases and marks where the Play Store goes", () => {
    expect(read("index.html")).toContain('href="download.html"');
    const download = read("download.html");
    expect(download).toContain('href="https://github.com/grlnsngh/pianoverse/releases/latest/download/pianoverse.apk"');
    expect(download).toContain("PLAY STORE:");
    expect(download).toContain("play.google.com/store/apps/details?id=com.grlnsngh.pianoverse");
    // The package the Play Store link names is the app's own
    const app = JSON.parse(read("app.json"));
    expect(app.expo.android.package).toBe("com.grlnsngh.pianoverse");
  });

  it("say the version, size and date of the APK that is published, from web/release.json", () => {
    // npm run publish:apk writes release.json and fills in these spans (scripts/publish-apk.js)
    const { releaseWords } = require("../scripts/publish-apk");
    const release = JSON.parse(read("web/release.json"));
    const words = releaseWords(release);
    expect(release.tag).toBe(`v${release.version}`);
    // The file's fingerprint (SHA-256): 64 hexadecimal characters, shown on the download page
    expect(release.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(read("download.html")).toContain(`<span data-release="sha256">${release.sha256}</span>`);
    for (const page of SITE_PAGES) {
      const spans = [...read(page).matchAll(/<span data-release="(\w+)">([^<]*)<\/span>/g)];
      expect(spans.length).toBeGreaterThanOrEqual(2);
      for (const [, key, shown] of spans) expect(shown).toBe(words[key]);
    }
    // It is never ahead of the app: a release is of a version that was built
    const app = JSON.parse(read("app.json"));
    expect(release.versionCode).toBeLessThanOrEqual(app.expo.android.versionCode);
  });

  it("make up nothing: no ratings, download counts or quotes", () => {
    for (const page of SITE_PAGES) {
      const html = read(page);
      expect(html).not.toMatch(/★|\b\d[\d,.]*\+?\s*(downloads|users|reviews)\b|rated \d/i);
      expect(html).not.toMatch(/<blockquote/);
    }
  });

  it("have a picture for links shared on WhatsApp and elsewhere", () => {
    for (const page of SITE_PAGES) {
      expect(read(page)).toContain('content="https://grlnsngh.github.io/pianoverse/web/og.png"');
    }
    const png = fs.readFileSync(path.join(root, "web/og.png"));
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
