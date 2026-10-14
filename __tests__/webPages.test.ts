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
 * The pages that open in a browser (the landing page, the reset page, the
 * privacy policy and the delete-account page, served by GitHub Pages) look like the app: same colours, same motion, and
 * only files that exist. docs/redesign/WEB.md lists them.
 */

const root = path.join(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const PAGES = ["index.html", "reset-password.html", "privacy.html", "delete-account.html"];
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
      .map((m) => m[1])
      .filter((value) => !/^(https?:|mailto:|pianoverse:|#|\.\/$)/.test(value));

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
    expect(read("lib/appwrite.ts")).toContain("createRecovery(email, RESET_PASSWORD_URL)");
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
