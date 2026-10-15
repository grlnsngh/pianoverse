import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

/**
 * Crash reports (R2 in docs/redesign/IDEAS.md): when the app breaks on a
 * phone, Sentry gets the error, where in the code, the screen's route, the
 * phone's model and system and the app's version, so it can be fixed without
 * waiting to hear about it. Nothing about customers goes with it: no
 * screenshots or screen text, no touches, and numbers and email addresses are
 * masked in what is sent. The only person in a report is the account's ID.
 *
 * Only an installed build sends reports: not while developing, not on the web.
 */

/** Where reports go: the "pianoverse" project of the owner's Sentry. Safe to keep in the app; it can only send. */
export const SENTRY_DSN =
  "https://e94d634458a6017250d1d29c332e899b@o4512261246550016.ingest.us.sentry.io/4512261409472512";

/** Whether this copy of the app sends reports. */
export const crashReportsOn = (dev: boolean = __DEV__, os: string = Platform.OS) => !dev && os !== "web";

/**
 * Email addresses, and phone numbers (10 digits or more, as typed with spaces
 * or dashes), masked. Dates and amounts have fewer digits and stay.
 */
export const scrubText = (text: string): string =>
  text
    .replace(/[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s-]{8,}\d/g, (match) => (match.replace(/\D/g, "").length >= 10 ? "[number]" : match));

/** An address without its query, which can carry IDs and search words. */
const withoutQuery = (url: unknown) => (typeof url === "string" ? url.split("?")[0] : url);

/**
 * A breadcrumb (what happened before the error) as it may be sent, or null to
 * leave it out: touches are left out (their labels can be a customer's name),
 * console lines lose their arguments, and addresses lose their query.
 */
export const scrubBreadcrumb = (breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null => {
  if (breadcrumb.category === "touch" || breadcrumb.category === "ui.click") return null;
  const scrubbed: Sentry.Breadcrumb = { ...breadcrumb };
  if (scrubbed.message) scrubbed.message = scrubText(scrubbed.message).slice(0, 300);
  if (breadcrumb.category === "console") {
    delete scrubbed.data;
  } else if (scrubbed.data) {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(scrubbed.data)) {
      if (key === "url" || key === "to" || key === "from") data[key] = withoutQuery(value);
      else if (typeof value === "number" || typeof value === "boolean" || key === "method" || key === "status_code") data[key] = value;
    }
    scrubbed.data = data;
  }
  return scrubbed;
};

/** A report as it may be sent: the account's ID only, and no numbers or emails in the messages. */
export const scrubEvent = <T extends Sentry.ErrorEvent>(event: T): T => {
  const scrubbed = { ...event };
  scrubbed.user = event.user?.id ? { id: String(event.user.id) } : undefined;
  if (scrubbed.message) scrubbed.message = scrubText(scrubbed.message);
  if (event.exception?.values) {
    scrubbed.exception = {
      ...event.exception,
      values: event.exception.values.map((value) => ({
        ...value,
        value: value.value ? scrubText(value.value) : value.value,
      })),
    };
  }
  if (event.breadcrumbs) {
    scrubbed.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((breadcrumb): breadcrumb is Sentry.Breadcrumb => breadcrumb !== null);
  }
  delete scrubbed.request;
  return scrubbed;
};

let started = false;

/** Starts sending crash reports, once, from an installed build. Returns whether it did. */
export const startCrashReports = (): boolean => {
  if (started || !crashReportsOn()) return started;
  Sentry.init({
    dsn: SENTRY_DSN,
    // "preview" for the builds installed by hand, "production" for the store
    environment: Updates.channel || "preview",
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // Errors only: no performance tracing
    tracesSampleRate: 0,
    maxBreadcrumbs: 50,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
  });
  // Which over-the-air update the phone is running, if any
  Sentry.setTag("update", Updates.isEmbeddedLaunch === false && Updates.updateId ? Updates.updateId.slice(0, 8) : "built-in");
  Sentry.setTag("runtime", Updates.runtimeVersion ?? "unknown");
  started = true;
  return true;
};

/** Names the account in reports by its ID only (nothing when signed out). */
export const setCrashReportAccount = (accountId: string | null | undefined) => {
  if (!started) return;
  Sentry.setUser(accountId ? { id: accountId } : null);
};

/** Starts again from nothing. For tests. */
export const resetCrashReportsForTests = () => {
  started = false;
};
