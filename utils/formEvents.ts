import type { Agreement, PaperFormId } from "@/utils/paperForms/catalog";

/**
 * The usage counts of the paper forms (Batch 32): which form a person opened,
 * saved, printed or shared, so the owner can see which forms are used. Never
 * what is on them: every form is blank, and the letterhead and business
 * details stay on the phone. One row in the Appwrite table `form_events` each.
 */

/** What is counted: a form, an agreement, the full kit, or the letterhead's test page. These names never change once released. */
export type FormEventForm =
  | PaperFormId
  | Agreement["id"]
  | "kit"
  | "letterhead_test";

/** Opened: its screen was opened. The others: the PDF was saved, printed or shared. */
export type FormEventAction = "opened" | "saved" | "printed" | "shared";

export const FORM_EVENT_FORMS: readonly FormEventForm[] = [
  "rent_card",
  "receipts",
  "piano_register",
  "rental_register",
  "handover",
  "agreement_hotel",
  "agreement_private",
  "kit",
  "letterhead_test",
];

export const FORM_EVENT_ACTIONS: readonly FormEventAction[] = ["opened", "saved", "printed", "shared"];

/** One count waiting on the phone to be sent. */
export type FormEvent = {
  /** Made when it happened, so sending it twice can't count it twice */
  id: string;
  /** The account it belongs to */
  creator: string;
  form: FormEventForm;
  action: FormEventAction;
  /** The PDF's pages, for saved, printed and shared */
  pages: number | null;
  /** When it happened (ISO), which may be long before it is sent */
  happenedAt: string;
  /** "1.1.20", or "1.1.20+a1b2c3d4" when running an update */
  appVersion: string | null;
  platform: string;
};

/** The most counts kept waiting: the oldest go first when there are more. */
export const MAX_QUEUED = 200;

const isIn = <T extends string>(list: readonly T[], value: unknown): value is T =>
  list.includes(value as T);

/** Appwrite's row ID rules: letters, digits, period, hyphen and underscore, at most 36, not starting with a symbol. */
const ROW_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;

const shortText = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

/** A stored count, or null if it isn't one (so a damaged queue never stops the rest). */
export const cleanFormEvent = (value: unknown): FormEvent | null => {
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  const creator = shortText(event.creator, 255);
  if (typeof event.id !== "string" || !ROW_ID.test(event.id) || !creator) return null;
  if (!isIn(FORM_EVENT_FORMS, event.form) || !isIn(FORM_EVENT_ACTIONS, event.action)) return null;
  if (typeof event.happenedAt !== "string" || Number.isNaN(Date.parse(event.happenedAt))) return null;
  const pages =
    typeof event.pages === "number" && Number.isInteger(event.pages) && event.pages >= 0 && event.pages <= 10000
      ? event.pages
      : null;
  return {
    id: event.id,
    creator,
    form: event.form,
    action: event.action,
    pages,
    happenedAt: event.happenedAt,
    appVersion: shortText(event.appVersion, 50),
    platform: shortText(event.platform, 20) ?? "unknown",
  };
};

/** The stored queue, each count checked, the newest MAX_QUEUED kept. */
export const cleanQueue = (stored: unknown): FormEvent[] => {
  if (!Array.isArray(stored)) return [];
  const events = stored.map(cleanFormEvent).filter((event): event is FormEvent => event !== null);
  return events.slice(-MAX_QUEUED);
};

/** The version the count is sent with: "1.1.20", or "1.1.20+a1b2c3d4" for an update that came over the air. */
export const appVersionFor = (
  version: string | null | undefined,
  updateId: string | null | undefined,
  isEmbedded: boolean | null | undefined
): string | null => {
  if (!version) return null;
  return updateId && isEmbedded === false ? `${version}+${updateId.slice(0, 8)}` : version;
};

/** The row as Appwrite's `form_events` table takes it. */
export const formEventRow = (event: FormEvent) => ({
  creator: event.creator,
  form: event.form,
  action: event.action,
  happened_at: event.happenedAt,
  platform: event.platform,
  ...(event.pages !== null ? { pages: event.pages } : {}),
  ...(event.appVersion ? { app_version: event.appVersion } : {}),
});

/**
 * What to do when sending a count fails: try again later (no connection,
 * signed out, the table missing, Appwrite busy or down), or let it go (a
 * count Appwrite will never take, or one it already has).
 */
export const sendFailure = (error: unknown): "retry" | "drop" => {
  const code = (error as { code?: unknown })?.code;
  if (typeof code !== "number" || code === 0) return "retry";
  if (code === 401 || code === 404 || code === 408 || code === 429 || code >= 500) return "retry";
  return "drop";
};
