import fs from "fs";
import path from "path";
import { colors } from "@/constants/theme";

/**
 * The "Reset password" email (email/password-recovery.html), which is pasted
 * into the Appwrite console. Email apps are strict: no scripts, no style
 * blocks, no flexbox, so everything is inline and table based. Nothing here
 * can be seen until it is sent, so the rules are checked instead.
 */

const root = path.join(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const email = read("email/password-recovery.html");

describe("the password recovery email", () => {
  it("links to the reset page with the variable Appwrite fills in, and to nothing else", () => {
    const links = [...email.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(
      (m) => m[1]
    );

    expect(links).toEqual([
      "{{redirect}}",
      "{{redirect}}",
      "mailto:support@pianoverse.com",
    ]);
  });

  it("greets the person by the name Appwrite fills in", () => {
    expect(email).toContain("Hello {{user}},");
  });

  it("has a big orange button with the app's ink-on-orange colours and 14 radius", () => {
    const button = email.match(
      /<a\b[^>]*href="\{\{redirect\}\}"[^>]*>Choose a new password<\/a>/
    );
    expect(button).not.toBeNull();
    expect(button?.[0]).toContain(`color:${colors.ink.toUpperCase()}`);
    expect(email).toContain(`bgcolor="${colors.brand.toUpperCase()}"`);
    expect(email).toContain("border-radius:14px");
  });

  it("uses only the app's colours", () => {
    const allowed = new Set(
      Object.values(colors).map((value) => value.toUpperCase())
    );
    const used = [...email.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) =>
      m[0].toUpperCase()
    );

    expect(used.length).toBeGreaterThan(5);
    expect(used.filter((value) => !allowed.has(value))).toEqual([]);
  });

  it("is safe and simple enough for email apps: inline, tables, no scripts or style blocks", () => {
    expect(email).not.toMatch(/<script/i);
    expect(email).not.toMatch(/<style/i);
    expect(email).not.toMatch(/display:\s*flex|display:\s*grid/i);
    expect(email).not.toMatch(/url\(|@import|@font-face/i);
    for (const table of email.matchAll(/<table\b[^>]*>/g)) {
      expect(table[0]).toContain('role="presentation"');
    }
  });

  it("stays a phone-width card, so it reads on a phone without zooming", () => {
    expect(email).toContain('name="viewport"');
    expect(email).toContain("max-width:480px");
  });

  it("is light whatever the inbox's mode, like the app", () => {
    expect(email).toContain('name="color-scheme" content="light only"');
  });

  it("shows the mark from the published site, which has the file, and says nothing for it to a screen reader", () => {
    const images = [...email.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);

    expect(images).toHaveLength(1);
    const source = images[0].match(/src="([^"]+)"/)?.[1] ?? "";
    expect(source).toBe("https://grlnsngh.github.io/pianoverse/web/mark.png");
    expect(fs.existsSync(path.join(root, "web", path.basename(source)))).toBe(
      true
    );
    // The name next to it is text, so the mark itself is decoration
    expect(images[0]).toContain('alt=""');
    expect(images[0]).toMatch(/width="40"/);
    expect(images[0]).toMatch(/height="40"/);
  });

  it("gives the link as text too, for when the button doesn't work, and lets it wrap", () => {
    expect(email).toContain("Button not working?");
    expect(email).toMatch(
      /word-break:break-all[^>]*><a[^>]*>\{\{redirect\}\}<\/a>/
    );
  });

  it("says what to do when nobody asked for it, and that the link works once", () => {
    expect(email).toContain("Didn’t ask for this? You can ignore this email.");
    expect(email).toContain("the link works once");
  });

  it("shows the start of the message in the inbox list", () => {
    const hidden =
      email.match(/display:none[^>]*>\s*([^<]+?)\s*<\/div>/)?.[1] ?? "";

    expect(hidden).toContain(
      "Choose a new password for your Pianoverse account"
    );
  });
});
