jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => {
  const context = {
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  };
  return { useGlobalContext: () => context };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Platform } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import Profile from "@/app/(tabs)/profile";
import Today from "@/app/(tabs)/today";
import SignOutSheet from "@/components/SignOutSheet";
import * as appwrite from "@/lib/appwrite";
import { resetMorningSummarySettingForTests } from "@/lib/morningSummarySetting";
import { PianoDataContext } from "@/lib/PianoDataContext";
import { resetServiceLogForTests } from "@/lib/serviceLogStore";
import { paymentsChanged } from "@/redux/payments/actions";
import { setActiveTab } from "@/redux/navigation/actions";
import store from "@/redux/store";
import { handleNotificationResponse, prepareRentalReminders, scheduleMorningSummaries } from "@/services/notifications";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications, summaryTap } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import {
  allTexts,
  captureToastCalls,
  createTestStore,
  flushPromises,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

/**
 * The 9:00 morning summary in the app (Batch 40): Today puts the summaries in
 * place as its data loads and changes, Account has the switch, and tapping one
 * opens Today. Now is 08:00 on 29 September 2026.
 */

beforeEach(async () => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 8, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  await AsyncStorage.clear();
  resetMorningSummarySettingForTests();
  resetServiceLogForTests();
  fakeBackend.reset();
  fakeNotifications.reset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Began 1 June at ₹6,000 a month: four months have fallen due and one is paid
const asha = makePiano({
  $id: "kawai",
  title: "Kawai K-300",
  category: "rentable",
  rental_customer_name: "Asha Mehta",
  rental_customer_mobile: "9876543210",
  rental_period_start: "2026-06-01" as any,
  rental_period_end: "2026-12-01" as any,
  rental_price: 6000,
});
// Paid up, and nothing falls due for a week
const quiet = makePiano({
  $id: "weber",
  title: "Weber W-121",
  category: "rentable",
  rental_customer_name: "Ravi Kumar",
  rental_period_start: "2026-08-15" as any,
  rental_period_end: "2026-12-15" as any,
  rental_price: 4000,
});

const seedPayment = (id: string, pianoId: string, paidOn: string, amount: number, customer: string) =>
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: `${paidOn}T09:00:00.000+00:00`,
    piano_id: pianoId,
    creator: testUser.accountId,
    amount,
    paid_on: paidOn,
    customer_name: customer,
  });

const staleSummary = () =>
  fakeNotifications.scheduled.push({
    identifier: "stale-1",
    content: { title: "🎹 Good morning", body: "old", data: { type: "morning_summary" } },
    trigger: { date: new Date(2026, 8, 30, 9, 0, 0) },
  });

const openToday = async (
  items = [asha, quiet],
  { status = "ready" as "ready" | "loading" | "failed" } = {}
) => {
  const store = createTestStore({ user: testUser, items });
  const renderer = renderWithStore(
    <PianoDataContext.Provider value={{ status, reportStatus: jest.fn(), refresher: { current: null } } as any}>
      <Today />
    </PianoDataContext.Provider>,
    store
  );
  await flushPromises();
  return { store, renderer };
};

const bodies = () => fakeNotifications.morningSummaries().map((summary) => summary.content.body);
const times = () =>
  fakeNotifications.morningSummaries().map((summary) => {
    const date: Date = summary.trigger.date;
    return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  });

describe("Today puts the morning summaries in place", () => {
  it("at 9:00 on each of the next mornings that has something to say, with what is true that morning", async () => {
    seedPayment("p1", "kawai", "2026-06-02", 6000, "Asha Mehta");
    seedPayment("p2", "weber", "2026-08-16", 4000, "Ravi Kumar");
    seedPayment("p3", "weber", "2026-09-16", 4000, "Ravi Kumar");

    await openToday();

    expect(times()).toEqual(["9-29 9:00", "9-30 9:00", "10-1 9:00", "10-2 9:00", "10-3 9:00", "10-4 9:00", "10-5 9:00"]);
    const [first] = fakeNotifications.morningSummaries();
    expect(first.content).toMatchObject({ title: "🎹 Good morning", data: { type: "morning_summary" } });
    expect(bodies()[0]).toBe("₹18,000 to collect from Asha Mehta");
    // October's rent falls due on 1 October: from that morning it is ₹24,000 from her
    expect(bodies()[2]).toBe("₹24,000 to collect from Asha Mehta");
  });

  it("none at all when there is nothing to say, and the old ones are taken away", async () => {
    staleSummary();
    seedPayment("p2", "weber", "2026-08-16", 4000, "Ravi Kumar");
    seedPayment("p3", "weber", "2026-09-16", 4000, "Ravi Kumar");

    await openToday([quiet]);

    expect(fakeNotifications.morningSummaries()).toEqual([]);
  });

  it("puts them in place again after a payment is recorded", async () => {
    seedPayment("p1", "kawai", "2026-06-02", 6000, "Asha Mehta");
    seedPayment("p2", "weber", "2026-08-16", 4000, "Ravi Kumar");
    seedPayment("p3", "weber", "2026-09-16", 4000, "Ravi Kumar");
    const { store } = await openToday();
    expect(fakeNotifications.morningSummaries()).toHaveLength(7);

    // The rent that was due is paid: what is left is October's, which falls due on the 1st
    seedPayment("p4", "kawai", "2026-09-29", 18000, "Asha Mehta");
    await act(async () => {
      store.dispatch(paymentsChanged() as any);
    });
    await flushPromises();

    expect(times()).toEqual(["10-1 9:00", "10-2 9:00", "10-3 9:00", "10-4 9:00", "10-5 9:00"]);
    expect(bodies()[0]).toBe("₹6,000 to collect from Asha Mehta");
  });

  it("only when the pianos have loaded: until then the ones there are stay", async () => {
    staleSummary();
    seedPayment("p1", "kawai", "2026-06-02", 6000, "Asha Mehta");

    await openToday([asha], { status: "loading" });

    expect(bodies()).toEqual(["old"]);
  });

  it("only when the payments are known: if they can't be read, the ones there stay", async () => {
    staleSummary();
    fakeBackend.missingCollections.add("rent_payments");

    await openToday();

    expect(bodies()).toEqual(["old"]);
  });

  it("says nothing about tunings from a service log that isn't there, and still plans the rest", async () => {
    fakeBackend.missingCollections.add("service_log");
    seedPayment("p1", "kawai", "2026-06-02", 6000, "Asha Mehta");

    await openToday([asha]);

    expect(bodies()[0]).toBe("₹18,000 to collect from Asha Mehta");
  });

  it("says a tuning that is due too, from the service log", async () => {
    seedPayment("p2", "weber", "2026-08-16", 4000, "Ravi Kumar");
    seedPayment("p3", "weber", "2026-09-16", 4000, "Ravi Kumar");
    // Tuned on 29 March: six months on, it is due today
    fakeBackend.service.set("s1", {
      $id: "s1",
      $createdAt: "2026-03-29T10:00:00.000+00:00",
      piano_id: "weber",
      creator: testUser.accountId,
      serviced_on: "2026-03-29",
      kind: "tuning",
    });

    await openToday([quiet]);

    expect(bodies()[0]).toBe("1 tuning: 1 due today");
    expect(bodies()[1]).toBe("1 tuning: 1 overdue");
  });

  it("none when the owner has switched it off, and the old ones are taken away", async () => {
    await AsyncStorage.setItem("morningSummary:off", "1");
    staleSummary();
    seedPayment("p1", "kawai", "2026-06-02", 6000, "Asha Mehta");

    await openToday([asha]);

    expect(fakeNotifications.morningSummaries()).toEqual([]);
  });

  it("starts with tomorrow once 9:00 has passed", async () => {
    jest.setSystemTime(new Date(2026, 8, 29, 10, 15, 0));
    seedPayment("p1", "kawai", "2026-06-02", 6000, "Asha Mehta");

    await openToday([asha]);

    expect(times()[0]).toBe("9-30 9:00");
    expect(fakeNotifications.morningSummaries()).toHaveLength(6);
  });
});

describe("the Morning summary switch on Account", () => {
  const openAccount = async () => {
    const renderer = renderWithStore(<Profile />, createTestStore({ user: testUser, items: [asha] }));
    await flushPromises();
    return renderer;
  };
  const summarySwitch = (renderer: ReactTestRenderer) => {
    const [node] = renderer.root.findAll(
      (candidate) => candidate.props.accessibilityLabel === "Morning summary" && typeof candidate.props.onValueChange === "function"
    );
    if (!node) throw new Error("No Morning summary switch");
    return node;
  };
  const flip = async (renderer: ReactTestRenderer, value: boolean) => {
    await act(async () => {
      await summarySwitch(renderer).props.onValueChange(value);
    });
    await flushPromises();
  };

  it("is there, on to start with, and says what it does", async () => {
    const renderer = await openAccount();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Morning summary");
    expect(texts).toContain(
      "At 9:00 AM, only on days when rent is due, a rental has ended or ends that day, or a tuning is due. Tap it to open Today."
    );
    expect(summarySwitch(renderer).props.value).toBe(true);
    expect(summarySwitch(renderer).props.accessibilityLabel).toBe("Morning summary");
  });

  it("takes the summaries away at once when it is turned off, and remembers it", async () => {
    const toasts = captureToastCalls();
    staleSummary();
    const renderer = await openAccount();

    await flip(renderer, false);

    expect(summarySwitch(renderer).props.value).toBe(false);
    expect(fakeNotifications.morningSummaries()).toEqual([]);
    expect(await AsyncStorage.getItem("morningSummary:off")).toBe("1");
    expect(toasts.map((toast) => toast.message)).toEqual(["Morning summary is off"]);
  });

  it("is turned on again, and says so", async () => {
    const toasts = captureToastCalls();
    await AsyncStorage.setItem("morningSummary:off", "1");
    const renderer = await openAccount();
    expect(summarySwitch(renderer).props.value).toBe(false);

    await flip(renderer, true);

    expect(summarySwitch(renderer).props.value).toBe(true);
    expect(await AsyncStorage.getItem("morningSummary:off")).toBeNull();
    expect(toasts).toEqual([expect.objectContaining({ message: "Morning summary is on", variant: "success" })]);
  });

  it("is usable: everything named and big enough to press", async () => {
    const renderer = await openAccount();

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });

  it("is where the summaries are taken away at sign out", async () => {
    staleSummary();
    const renderer = await openAccount();
    jest.spyOn(appwrite, "signOut").mockResolvedValue(undefined as any);

    await pressLabel(renderer.root, "Sign out");
    const sheet = renderer.root.findByType(SignOutSheet);
    await act(async () => {
      await sheet.props.onConfirm();
    });
    await flushPromises();

    expect(fakeNotifications.morningSummaries()).toEqual([]);
  });
});

describe("a morning summary on the phone", () => {
  it("is replaced, never added to: scheduling again leaves only the new ones", async () => {
    await scheduleMorningSummaries([
      { date: new Date(2026, 8, 30, 9, 0, 0), title: "🎹 Good morning", body: "one" },
      { date: new Date(2026, 9, 1, 9, 0, 0), title: "🎹 Good morning", body: "two" },
    ]);
    await scheduleMorningSummaries([{ date: new Date(2026, 9, 2, 9, 0, 0), title: "🎹 Good morning", body: "three" }]);

    expect(bodies()).toEqual(["three"]);
  });

  it("leaves the rental and tuning reminders alone", async () => {
    fakeNotifications.scheduled.push(
      { identifier: "r", content: { data: { type: "rental_due", pianoId: "p" } }, trigger: {} },
      { identifier: "s", content: { data: { type: "service_due", pianoId: "p" } }, trigger: {} }
    );

    await scheduleMorningSummaries([{ date: new Date(2026, 8, 30, 9, 0, 0), title: "t", body: "b" }]);
    await scheduleMorningSummaries([]);

    expect(fakeNotifications.scheduled.map((notification) => notification.identifier)).toEqual(["r", "s"]);
  });

  it("never schedules one whose time has already passed", async () => {
    await scheduleMorningSummaries([{ date: new Date(2026, 8, 29, 7, 0, 0), title: "t", body: "late" }]);

    expect(fakeNotifications.morningSummaries()).toEqual([]);
  });

  it("goes through its own Android channel, so it can be switched off in the phone's settings on its own", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    await prepareRentalReminders();
    await scheduleMorningSummaries([{ date: new Date(2026, 8, 30, 9, 0, 0), title: "t", body: "b" }]);

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "morning-summary",
      expect.objectContaining({ name: "Morning summary", importance: 3 })
    );
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith("rental-reminders", expect.anything());
    expect(fakeNotifications.morningSummaries()[0].trigger.channelId).toBe("morning-summary");
  });

  it("opens Today when it is tapped, from wherever the app is", () => {
    store.dispatch(setActiveTab("account") as any);

    handleNotificationResponse(summaryTap() as any);

    expect(store.getState().navigation.activeTab).toBe("today");
    expect(router.navigate).toHaveBeenCalledWith("/home");
    expect(router.push).not.toHaveBeenCalled();
  });
});
