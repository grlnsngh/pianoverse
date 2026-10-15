jest.mock("@/lib/appwrite", () => ({ createFormEvent: jest.fn() }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createFormEvent } from "@/lib/appwrite";
import { forgetFormEvents, recordFormEvent, sendFormEvents, waitingFormEvents } from "@/lib/formEvents";
import {
  appVersionFor,
  cleanFormEvent,
  cleanQueue,
  FORM_EVENT_FORMS,
  formEventRow,
  MAX_QUEUED,
  sendFailure,
  type FormEvent,
} from "@/utils/formEvents";
import { AGREEMENTS, PAPER_FORMS } from "@/utils/paperForms/catalog";

/** The paper forms' usage counts (Batch 32): what is counted, and how it waits on the phone and is sent. */

const send = createFormEvent as jest.Mock;

const event = (extra: Partial<FormEvent> = {}): FormEvent => ({
  id: "abc123",
  creator: "account-1",
  form: "rent_card",
  action: "saved",
  pages: 2,
  happenedAt: "2026-10-15T09:30:00.000Z",
  appVersion: "1.1.20",
  platform: "android",
  ...extra,
});

/** Lets the queue's reads, writes and sends finish. */
const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((resolve) => setImmediate(resolve));
};

const offline = () => Object.assign(new Error("Network request failed"), { code: 0 });
const appwriteError = (code: number) => Object.assign(new Error(`Appwrite ${code}`), { code });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  send.mockResolvedValue({});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("what is counted", () => {
  it("knows every form, both agreements, the kit and the test page by names that never change", () => {
    expect(FORM_EVENT_FORMS).toEqual([
      ...PAPER_FORMS.map((form) => form.id),
      AGREEMENTS.hotel.id,
      AGREEMENTS.private.id,
      "kit",
      "letterhead_test",
    ]);
  });

  it("sends the row Appwrite's form_events table takes, leaving out what isn't known", () => {
    expect(formEventRow(event())).toEqual({
      creator: "account-1",
      form: "rent_card",
      action: "saved",
      pages: 2,
      happened_at: "2026-10-15T09:30:00.000Z",
      app_version: "1.1.20",
      platform: "android",
    });
    expect(formEventRow(event({ action: "opened", pages: null, appVersion: null }))).toEqual({
      creator: "account-1",
      form: "rent_card",
      action: "opened",
      happened_at: "2026-10-15T09:30:00.000Z",
      platform: "android",
    });
  });

  it("says which version made it, and which update when one came over the air", () => {
    expect(appVersionFor("1.1.20", null, true)).toBe("1.1.20");
    expect(appVersionFor("1.1.20", "a1b2c3d4-e5f6", true)).toBe("1.1.20");
    expect(appVersionFor("1.1.20", "a1b2c3d4-e5f6", false)).toBe("1.1.20+a1b2c3d4");
    expect(appVersionFor(undefined, "a1b2c3d4", false)).toBeNull();
  });
});

describe("a stored count", () => {
  it("is kept only when it is a whole count", () => {
    expect(cleanFormEvent(event())).toEqual(event());
    expect(cleanFormEvent({ ...event(), form: "agreement" })).toBeNull();
    expect(cleanFormEvent({ ...event(), action: "downloaded" })).toBeNull();
    expect(cleanFormEvent({ ...event(), creator: " " })).toBeNull();
    expect(cleanFormEvent({ ...event(), id: "-starts-with-a-symbol" })).toBeNull();
    expect(cleanFormEvent({ ...event(), happenedAt: "yesterday" })).toBeNull();
    expect(cleanFormEvent("rent_card")).toBeNull();
    expect(cleanFormEvent({ ...event(), pages: -1 })?.pages).toBeNull();
    expect(cleanFormEvent({ ...event(), platform: undefined })?.platform).toBe("unknown");
  });

  it("keeps the newest 200 waiting, and skips what is damaged", () => {
    const many = Array.from({ length: MAX_QUEUED + 5 }, (_, i) => event({ id: `e${i}` }));

    const kept = cleanQueue([...many, { nonsense: true }]);

    expect(kept).toHaveLength(MAX_QUEUED);
    expect(kept[0].id).toBe("e5");
    expect(cleanQueue("not a list")).toEqual([]);
  });

  it("is tried again later when it can't go yet, and let go when Appwrite will never take it", () => {
    for (const error of [offline(), new Error("no code"), appwriteError(401), appwriteError(404), appwriteError(429), appwriteError(503)]) {
      expect(sendFailure(error)).toBe("retry");
    }
    for (const code of [400, 409]) expect(sendFailure(appwriteError(code))).toBe("drop");
  });
});

describe("counting on the phone", () => {
  it("sends a count at once with the account, the version and the phone's system", async () => {
    recordFormEvent("account-1", "agreement_hotel", "printed", 4);
    await settle();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      creator: "account-1",
      form: "agreement_hotel",
      action: "printed",
      pages: 4,
      platform: Platform.OS,
    });
    expect(Date.parse(send.mock.calls[0][0].happenedAt)).not.toBeNaN();
    expect(await waitingFormEvents()).toEqual([]);
  });

  it("counts nothing without an account", async () => {
    recordFormEvent(null, "rent_card", "opened");
    recordFormEvent(undefined, "rent_card", "opened");
    await settle();

    expect(send).not.toHaveBeenCalled();
    expect(await waitingFormEvents()).toEqual([]);
  });

  it("keeps what can't be sent without a connection, in order, and sends it all later", async () => {
    send.mockRejectedValue(offline());
    recordFormEvent("account-1", "rent_card", "opened");
    await settle();
    recordFormEvent("account-1", "rent_card", "saved", 1);
    await settle();

    const waiting = await waitingFormEvents();
    expect(waiting.map((e) => e.action)).toEqual(["opened", "saved"]);

    send.mockReset();
    send.mockResolvedValue({});
    await sendFormEvents();

    expect(send.mock.calls.map(([e]) => e.action)).toEqual(["opened", "saved"]);
    // The same count keeps its ID however often it is tried, so it is never counted twice
    expect(send.mock.calls.map(([e]) => e.id)).toEqual(waiting.map((e) => e.id));
    expect(await waitingFormEvents()).toEqual([]);
  });

  it("lets go of a count Appwrite already has or will never take, and sends the rest", async () => {
    await AsyncStorage.setItem(
      "paperForms:events",
      JSON.stringify([event({ id: "a1" }), event({ id: "b2" }), event({ id: "c3" })])
    );
    send.mockRejectedValueOnce(appwriteError(409)).mockRejectedValueOnce(appwriteError(400));

    await sendFormEvents();

    expect(send.mock.calls.map(([e]) => e.id)).toEqual(["a1", "b2", "c3"]);
    expect(await waitingFormEvents()).toEqual([]);
  });

  it("stops at the first count that must wait, keeping it and those after it", async () => {
    await AsyncStorage.setItem("paperForms:events", JSON.stringify([event({ id: "a1" }), event({ id: "b2" })]));
    send.mockRejectedValueOnce(appwriteError(401));

    await sendFormEvents();

    expect(send).toHaveBeenCalledTimes(1);
    expect((await waitingFormEvents()).map((e) => e.id)).toEqual(["a1", "b2"]);
  });

  it("never loses a count made while others are being sent", async () => {
    let finish!: () => void;
    send.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    recordFormEvent("account-1", "receipts", "saved", 1);
    await settle();
    recordFormEvent("account-1", "receipts", "shared", 1);
    await settle();

    finish();
    await settle();

    expect(send.mock.calls.map(([e]) => e.action)).toEqual(["saved", "shared"]);
    expect(await waitingFormEvents()).toEqual([]);
  });

  it("sends once at a time, however often it is asked", async () => {
    await AsyncStorage.setItem("paperForms:events", JSON.stringify([event()]));

    await Promise.all([sendFormEvents(), sendFormEvents(), sendFormEvents()]);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does nothing at all when nothing waits", async () => {
    await sendFormEvents();

    expect(send).not.toHaveBeenCalled();
  });

  it("forgets what wasn't sent, at sign out", async () => {
    send.mockRejectedValue(offline());
    recordFormEvent("account-1", "kit", "saved", 9);
    await settle();
    expect(await waitingFormEvents()).toHaveLength(1);

    await forgetFormEvents();

    expect(await waitingFormEvents()).toEqual([]);
    expect(await AsyncStorage.getItem("paperForms:events")).toBeNull();
  });

  it("never gets in the way: a phone that can't keep the count still makes its PDF", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));

    expect(() => recordFormEvent("account-1", "handover", "saved", 1)).not.toThrow();
    await settle();

    expect(console.warn).toHaveBeenCalledWith("Could not keep a form usage count:", expect.any(Error));
  });
});
