import fs from "fs";
import path from "path";
import { confirmPasswordError, newPasswordError } from "@/utils/authForms";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { JSDOM } = require("jsdom");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logic = require("../web/reset-logic.js");

/**
 * The reset page (reset-password.html): what it checks, what it says and what
 * it does, with the real page and scripts run in jsdom and Appwrite faked.
 */

const root = path.join(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("what the reset page says", () => {
  it("uses the app's words for a password that can't be used", () => {
    for (const password of ["", "short", "12345678"]) {
      expect(logic.passwordProblem(password)).toBe(
        newPasswordError(password, "Enter a new password.")
      );
    }
  });

  it("uses the app's words when the two passwords differ or one is missing", () => {
    for (const [password, confirmation] of [
      ["pianoverse1", ""],
      ["pianoverse1", "pianoverse2"],
      ["pianoverse1", "pianoverse1"],
    ]) {
      expect(logic.confirmationProblem(password, confirmation)).toBe(
        confirmPasswordError(password, confirmation)
      );
    }
  });

  it("puts a failure from Appwrite in plain words", () => {
    expect(logic.failureMessage(401, { type: "user_invalid_token" })).toBe(
      "This link has expired or was already used. Ask for a new one in the app."
    );
    expect(logic.failureMessage(429, {})).toBe(
      "Too many attempts. Wait a minute and try again."
    );
    // Anything else keeps Appwrite's own words, like the app does
    expect(
      logic.failureMessage(400, { message: "Password is too common." })
    ).toBe("Password is too common.");
    expect(logic.failureMessage(500, null)).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("reads the user and the secret from the link, and nothing else counts", () => {
    expect(logic.readLink("?userId=u1&secret=s1&expire=2026-09-30")).toEqual({
      userId: "u1",
      secret: "s1",
    });
    expect(logic.readLink("?userId=u1")).toBeNull();
    expect(logic.readLink("?secret=s1")).toBeNull();
    expect(logic.readLink("?userId=&secret=")).toBeNull();
    expect(logic.readLink("")).toBeNull();
  });
});

describe("sending the new password", () => {
  const link = { userId: "u1", secret: "s1" };

  it("asks Appwrite to update the recovery, in the app's project", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await expect(
      logic.updatePassword(fetchFn, link, "pianoverse1")
    ).resolves.toBe("");

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://cloud.appwrite.io/v1/account/recovery");
    expect(init.method).toBe("PUT");
    expect(init.headers["X-Appwrite-Project"]).toBe("66b2693000154e2fa3c8");
    expect(JSON.parse(init.body)).toEqual({
      userId: "u1",
      secret: "s1",
      password: "pianoverse1",
    });
  });

  it("gives back the message when Appwrite refuses", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ type: "user_invalid_token" }),
    });

    await expect(
      logic.updatePassword(fetchFn, link, "pianoverse1")
    ).resolves.toBe(logic.EXPIRED);
  });

  it("says the same when there is no connection", async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      logic.updatePassword(fetchFn, link, "pianoverse1")
    ).resolves.toBe(
      "We couldn’t reach Pianoverse. Check your connection and try again."
    );
  });

  it("copes with an answer that isn't JSON", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new SyntaxError("Unexpected token <")),
    });

    await expect(
      logic.updatePassword(fetchFn, link, "pianoverse1")
    ).resolves.toBe(logic.FALLBACK);
  });
});

describe("the reset page", () => {
  const html = read("reset-password.html")
    .replace(
      '<script src="web/reset-logic.js"></script>',
      `<script>${read("web/reset-logic.js")}</script>`
    )
    .replace(
      '<script src="web/reset-page.js"></script>',
      `<script>${read("web/reset-page.js")}</script>`
    );

  const open = (search = "?userId=u1&secret=s1", fetchFn = jest.fn()) => {
    const dom = new JSDOM(html, {
      url: `https://grlnsngh.github.io/pianoverse/reset-password.html${search}`,
      runScripts: "dangerously",
      pretendToBeVisual: true,
      beforeParse(window: any) {
        window.fetch = fetchFn;
      },
    });
    const { document } = dom.window;
    const $ = (id: string) => document.getElementById(id) as HTMLElement;
    const input = (id: string) => $(id) as HTMLInputElement;
    const type = (id: string, value: string) => {
      input(id).value = value;
      input(id).dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    };
    const submit = () =>
      $("reset-form").dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true })
      );
    const visible = () =>
      ["invalid", "form", "success"].filter(
        (name) => !$(`view-${name}`).hidden
      );
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
    return { dom, document, $, input, type, submit, visible, settle, fetchFn };
  };

  it("opens the form for a link from the email", () => {
    const page = open();
    expect(page.visible()).toEqual(["form"]);
  });

  it.each(["", "?userId=u1", "?secret=s1"])(
    "says the link isn't valid when it is %p",
    (search) => {
      const page = open(search);
      expect(page.visible()).toEqual(["invalid"]);
      expect(page.$("title-invalid").textContent).toBe("This link isn’t valid");
    }
  );

  it("checks both fields before sending, and starts at the first problem", () => {
    const page = open();

    page.type("password", "short");
    page.submit();

    expect(page.fetchFn).not.toHaveBeenCalled();
    expect(page.$("password-note-text").textContent).toBe(
      "Password must be at least 8 characters."
    );
    expect(page.$("password-field").classList.contains("is-error")).toBe(true);
    expect(page.$("confirm-note-text").textContent).toBe(
      "Confirm your password."
    );
    expect(page.input("password").getAttribute("aria-invalid")).toBe("true");
    expect(page.document.activeElement).toBe(page.input("password"));
    // The error's icon is shown (an svg only has the attribute, not .hidden)
    expect(page.$("password-note-icon").hasAttribute("hidden")).toBe(false);
  });

  it("says when the two passwords differ, and clears the message as you type", () => {
    const page = open();

    page.type("password", "pianoverse1");
    page.type("confirm", "pianoverse2");
    page.submit();
    expect(page.$("confirm-note-text").textContent).toBe(
      "Passwords do not match."
    );
    expect(page.document.activeElement).toBe(page.input("confirm"));

    page.type("confirm", "pianoverse1");
    expect(page.$("confirm-field").classList.contains("is-error")).toBe(false);
    expect(page.$("confirm-note").hidden).toBe(true);
  });

  it("checks a field when you leave it, but not when you only move to its Show button", () => {
    const page = open();

    page.input("password").focus();
    (
      page.document.querySelector('[data-for="password"]') as HTMLElement
    ).focus();
    expect(page.$("password-field").classList.contains("is-error")).toBe(false);

    page.input("confirm").focus();
    expect(page.$("password-field").classList.contains("is-error")).toBe(true);
    expect(page.$("password-note-text").textContent).toBe(
      "Enter a new password."
    );
  });

  it("shows and hides a password, and says what the button does", () => {
    const page = open();
    const button = page.document.querySelector(
      '[data-for="password"]'
    ) as HTMLElement;

    button.click();
    expect(page.input("password").type).toBe("text");
    expect(button.textContent).toBe("Hide");
    expect(button.getAttribute("aria-label")).toBe("Hide new password");
    expect(button.getAttribute("aria-pressed")).toBe("true");

    button.click();
    expect(page.input("password").type).toBe("password");
    expect(button.textContent).toBe("Show");
  });

  it("sends the new password, then says it is done and clears the fields", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const page = open("?userId=u1&secret=s1", fetchFn);

    page.type("password", "pianoverse1");
    page.type("confirm", "pianoverse1");
    page.submit();
    await page.settle();

    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({
      userId: "u1",
      secret: "s1",
      password: "pianoverse1",
    });
    expect(page.visible()).toEqual(["success"]);
    expect(page.input("password").value).toBe("");
    expect(page.input("confirm").value).toBe("");
    expect(page.document.activeElement).toBe(page.$("title-success"));
  });

  it("shows it is working, and ignores a second press meanwhile", async () => {
    let finish: (value: unknown) => void = () => {};
    const fetchFn = jest.fn(() => new Promise((resolve) => (finish = resolve)));
    const page = open("?userId=u1&secret=s1", fetchFn);

    page.type("password", "pianoverse1");
    page.type("confirm", "pianoverse1");
    page.submit();
    page.submit();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(page.$("submit-label").textContent).toBe("Updating");
    expect(page.$("submit-spinner").hidden).toBe(false);
    expect(page.$("submit").getAttribute("aria-disabled")).toBe("true");
    expect(page.input("password").readOnly).toBe(true);

    finish({ ok: true, status: 200 });
    await page.settle();
    expect(page.visible()).toEqual(["success"]);
    expect(page.$("submit-label").textContent).toBe("Update password");
  });

  it("puts a refusal in the red box and keeps what was typed so it can be tried again", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ type: "user_invalid_token" }),
    });
    const page = open("?userId=u1&secret=s1", fetchFn);

    page.type("password", "pianoverse1");
    page.type("confirm", "pianoverse1");
    page.submit();
    await page.settle();

    expect(page.visible()).toEqual(["form"]);
    expect(page.$("failure").hidden).toBe(false);
    expect(page.$("failure").getAttribute("role")).toBe("alert");
    expect(page.$("failure-text").textContent).toBe(logic.EXPIRED);
    expect(page.input("password").value).toBe("pianoverse1");
    expect(page.input("password").readOnly).toBe(false);

    // Typing again takes the box away
    page.type("password", "pianoverse12");
    expect(page.$("failure").hidden).toBe(true);
  });

  it("offers to open the app on the last page and the first page, and nowhere else", () => {
    const page = open();
    const links = [
      ...page.document.querySelectorAll('a[href^="pianoverse://"]'),
    ].map((a) => (a as HTMLAnchorElement).getAttribute("href"));
    expect(links.sort()).toEqual([
      "pianoverse://forget-password",
      "pianoverse://sign-in",
    ]);
  });

  it("names every field and control for a screen reader", () => {
    const page = open();
    for (const id of ["password", "confirm"]) {
      const label = page.document.querySelector(`label[for="${id}"]`);
      expect(label?.textContent?.trim()).toBeTruthy();
      expect(page.input(id).getAttribute("autocomplete")).toBe("new-password");
    }
    for (const button of page.document.querySelectorAll(".reveal")) {
      expect(button.getAttribute("aria-label")).toMatch(/^Show /);
    }
    for (const name of ["invalid", "form", "success"]) {
      const view = page.$(`view-${name}`);
      const heading = page.$(view.getAttribute("aria-labelledby") as string);
      expect(heading.tagName).toBe("H1");
    }
  });
});
