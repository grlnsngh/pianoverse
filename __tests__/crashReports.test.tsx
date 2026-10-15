import fs from "fs";
import path from "path";
import React from "react";
import * as Sentry from "@sentry/react-native";
import CrashReportAccount from "@/components/CrashReportAccount";
import {
  crashReportsOn,
  resetCrashReportsForTests,
  scrubBreadcrumb,
  scrubEvent,
  scrubText,
  SENTRY_DSN,
  setCrashReportAccount,
  startCrashReports,
} from "@/lib/crashReports";
import { createTestStore, flushPromises, renderWithStore } from "./helpers/render";

/** Crash reports (R2): sent from installed builds only, with nothing about customers in them. */

const root = path.join(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const globals = global as unknown as { __DEV__: boolean };

/** Runs `work` as an installed build would: not in development. */
const asBuild = (work: () => void) => {
  const dev = globals.__DEV__;
  globals.__DEV__ = false;
  try {
    work();
  } finally {
    globals.__DEV__ = dev;
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  resetCrashReportsForTests();
});

describe("when reports are sent", () => {
  it("only from an installed build: not while developing, and not on the web", () => {
    expect(crashReportsOn(false, "android")).toBe(true);
    expect(crashReportsOn(false, "ios")).toBe(true);
    expect(crashReportsOn(true, "android")).toBe(false);
    expect(crashReportsOn(false, "web")).toBe(false);
  });

  it("starts nothing while developing", () => {
    expect(startCrashReports()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("starts once in a build, to the owner's project, with errors only and nothing personal attached", () => {
    asBuild(() => {
      expect(startCrashReports()).toBe(true);
      expect(startCrashReports()).toBe(true);
    });

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect((Sentry.init as jest.Mock).mock.calls[0][0]).toMatchObject({
      dsn: SENTRY_DSN,
      environment: "preview",
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      tracesSampleRate: 0,
      beforeBreadcrumb: scrubBreadcrumb,
      beforeSend: scrubEvent,
    });
    expect(Sentry.setTag).toHaveBeenCalledWith("update", "built-in");
  });

  it("names the account by its ID only, and no one after sign out", () => {
    setCrashReportAccount("account-1");
    expect(Sentry.setUser).not.toHaveBeenCalled();

    asBuild(() => startCrashReports());
    setCrashReportAccount("account-1");
    setCrashReportAccount(null);

    expect((Sentry.setUser as jest.Mock).mock.calls).toEqual([[{ id: "account-1" }], [null]]);
  });

  it("follows the signed-in account from the app's own state", async () => {
    asBuild(() => startCrashReports());
    renderWithStore(<CrashReportAccount />, createTestStore({ user: { accountId: "account-7", username: "Gurdeep" } }));
    await flushPromises();

    expect(Sentry.setUser).toHaveBeenLastCalledWith({ id: "account-7" });
  });
});

describe("what a report carries", () => {
  it("masks phone numbers and email addresses in any text", () => {
    expect(scrubText("Couldn't send to +91 98140 12345 or 9814012345")).toBe("Couldn't send to [number] or [number]");
    expect(scrubText("reply to tps@example.com, please")).toBe("reply to [email], please");
    // Short numbers, amounts and dates are kept
    expect(scrubText("₹6000 due on 2026-10-01, 3 months")).toBe("₹6000 due on 2026-10-01, 3 months");
  });

  it("leaves out touches, whose labels can be a customer's name", () => {
    expect(scrubBreadcrumb({ category: "touch", message: "Touch event within element: Mr. Dutt" })).toBeNull();
    expect(scrubBreadcrumb({ category: "ui.click", message: "Mr. Dutt" })).toBeNull();
  });

  it("keeps a console line's words but not its arguments, and an address without its query", () => {
    expect(
      scrubBreadcrumb({ category: "console", message: "Could not save 98140 12345", data: { arguments: [{ name: "Mr. Dutt" }] } })
    ).toEqual({ category: "console", message: "Could not save [number]" });
    expect(
      scrubBreadcrumb({
        category: "xhr",
        data: { url: "https://cloud.appwrite.io/v1/databases/x/documents?queries[]=equal(creator)", method: "GET", status_code: 200, body: "{...}" },
      })
    ).toEqual({ category: "xhr", data: { url: "https://cloud.appwrite.io/v1/databases/x/documents", method: "GET", status_code: 200 } });
  });

  it("keeps the account's ID and nothing else about the person, and masks the error's text", () => {
    const event = scrubEvent({
      type: undefined,
      user: { id: "account-1", email: "gd@example.com", username: "Gurdeep", ip_address: "1.2.3.4" },
      message: "Failed for 98110 20513",
      exception: { values: [{ type: "Error", value: "Unknown customer tps@example.com" }] },
      breadcrumbs: [
        { category: "touch", message: "Mr. Dutt" },
        { category: "navigation", data: { to: "/detail/abc?from=today", from: "/" } },
      ],
      request: { url: "x" },
    } as Sentry.ErrorEvent);

    expect(event.user).toEqual({ id: "account-1" });
    expect(event.message).toBe("Failed for [number]");
    expect(event.exception?.values?.[0].value).toBe("Unknown customer [email]");
    expect(event.breadcrumbs).toEqual([{ category: "navigation", data: { to: "/detail/abc", from: "/" } }]);
    expect(event).not.toHaveProperty("request");
  });
});

describe("how it is set up", () => {
  it("starts in the root layout before anything is drawn, and follows the account there", () => {
    const layout = read("app/_layout.tsx");

    expect(layout).toMatch(/^startCrashReports\(\);$/m);
    expect(layout).toContain("<CrashReportAccount />");
  });

  it("builds with the owner's Sentry project and keeps no token in the app", () => {
    const plugin = JSON.parse(read("app.json")).expo.plugins.find(
      (entry: unknown) => Array.isArray(entry) && entry[0] === "@sentry/react-native"
    );

    expect(plugin[1]).toEqual({ organization: "grow-by-pixel", project: "pianoverse", url: "https://sentry.io/" });
    expect(read("app.json")).not.toMatch(/authToken|sntrys_/);
  });

  it("doesn't try to upload source maps from a build until a Sentry token is set up", () => {
    const profiles = JSON.parse(read("eas.json")).build;

    for (const name of ["development", "preview", "production"]) {
      expect(profiles[name].env.SENTRY_DISABLE_AUTO_UPLOAD).toBe("true");
    }
  });

  it("gives the bundles the IDs that match a crash to its source map", () => {
    expect(read("metro.config.js")).toContain('getSentryExpoConfig(__dirname)');
  });
});
