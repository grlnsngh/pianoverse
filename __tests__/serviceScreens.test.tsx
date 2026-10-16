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
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));

import { addDays, addMonths, format, subMonths } from "date-fns";
import React from "react";
import { Linking } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import { router, useLocalSearchParams } from "expo-router";
import DetailScreen from "@/app/detail/[id]";
import ServiceScreen from "@/app/service/[id]";
import Today from "@/app/(tabs)/today";
import { resetLetterheadStoreForTests, updateLetterheadDetails } from "@/lib/letterheadStore";
import { resetServiceLogForTests } from "@/lib/serviceLogStore";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  atFontScale,
  captureToastCalls,
  createTestStore,
  dialogOf,
  flushPromises,
  pressDialog,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

/** The tuning and service log in the app (canvas page "Tuning and service"). */

const day = (date: Date) => toStoredDate(date);
const today = new Date();

const rental = makePiano({
  $id: "piano-1",
  title: "Young Chang U-121",
  category: "rentable",
  rental_customer_name: "Meera Kapoor",
  rental_customer_mobile: "9876543210",
  rental_period_start: day(addDays(today, -60)) as any,
  rental_period_end: day(addDays(today, 60)) as any,
  rental_price: 4500,
});

let seq = 0;
const seedService = (servicedOn: Date, kind = "tuning", extra: Record<string, unknown> = {}, pianoId = "piano-1") => {
  const id = `seed-${++seq}`;
  fakeBackend.service.set(id, {
    $id: id,
    $createdAt: `2026-01-01T00:00:${String(seq).padStart(2, "0")}.000+00:00`,
    piano_id: pianoId,
    creator: testUser.accountId,
    serviced_on: day(servicedOn),
    kind,
    ...extra,
  });
  return id;
};

const rows = () => [...fakeBackend.service.values()];

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  resetServiceLogForTests();
  resetLetterheadStoreForTests();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "piano-1" });
  jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

const open = async (screen: React.ReactElement, pianos: PianoItem[] = [rental]) => {
  for (const piano of pianos) fakeBackend.documents.set(piano.$id, { ...piano });
  const renderer = renderWithStore(screen, createTestStore({ user: testUser, items: pianos }));
  await flushPromises();
  return renderer;
};

const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);

/** Lets a closing sheet's 300 ms pass, so what it chose opens. */
const sheetCloses = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 350)));

const longPress = async (renderer: ReactTestRenderer, labelStart: string) => {
  const node = renderer.root.find(
    (candidate) =>
      typeof candidate.props.onLongPress === "function" &&
      typeof candidate.props.accessibilityLabel === "string" &&
      candidate.props.accessibilityLabel.startsWith(labelStart)
  );
  await act(async () => node.props.onLongPress());
  await flushPromises();
};

describe("the Service section on a piano's page", () => {
  it("asks for the first service when none is logged, and logs a tuning that sets the next one", async () => {
    const toasts = captureToastCalls();
    const renderer = await open(<DetailScreen />);

    expect(has(renderer, "Service")).toBe(true);
    expect(has(renderer, "No service logged yet")).toBe(true);
    expect(has(renderer, "Every 6 months")).toBe(true);

    await pressLabel(renderer.root, "Log service");
    expect(has(renderer, "Next tuning: " + format(addMonths(today, 6), "d MMM yyyy"))).toBe(true);
    await pressLabel(renderer.root, "Save service");

    expect(rows()).toEqual([
      expect.objectContaining({ piano_id: "piano-1", creator: testUser.accountId, kind: "tuning", serviced_on: day(today) }),
    ]);
    expect(rows()[0]).not.toHaveProperty("cost");
    expect(toasts).toEqual([expect.objectContaining({ message: "Service logged", variant: "success" })]);
    expect(has(renderer, `Next tuning ${format(addMonths(today, 6), "d MMM yyyy")}`)).toBe(true);
    expect(has(renderer, "Tuning")).toBe(true);
  });

  it("logs another kind with its cost and note, which doesn't move the tuning", async () => {
    seedService(subMonths(today, 2));
    const renderer = await open(<DetailScreen />);

    await pressLabel(renderer.root, "Log service");
    await pressLabel(renderer.root, "Moving");
    expect(has(renderer, "Next tuning: " + format(addMonths(today, 6), "d MMM yyyy"))).toBe(false);
    const cost = renderer.root.findAll((node) => node.props.accessibilityLabel === "Cost" && typeof node.props.onChangeText === "function").pop()!;
    const note = renderer.root.findAll((node) => node.props.accessibilityLabel === "Note" && typeof node.props.onChangeText === "function").pop()!;
    act(() => cost.props.onChangeText("2,500"));
    act(() => note.props.onChangeText("To B-42, Sector 21"));
    await pressLabel(renderer.root, "Save service");

    expect(rows().find((row) => row.kind === "moving")).toMatchObject({ cost: 2500, note: "To B-42, Sector 21" });
    expect(has(renderer, `Next tuning ${format(addMonths(subMonths(today, 2), 6), "d MMM yyyy")}`)).toBe(true);
  });

  it("says a rented piano's tuning is due soon, and messages the renter about the visit", async () => {
    updateLetterheadDetails({ business: "The Piano Services" });
    const last = addDays(subMonths(today, 6), 5);
    seedService(last);
    const renderer = await open(<DetailScreen />);

    expect(has(renderer, "Tuning due in 5 days")).toBe(true);
    await pressLabel(renderer.root, "Message Meera Kapoor about the tuning");

    const url = decodeURIComponent((Linking.openURL as jest.Mock).mock.calls[0][0]);
    expect(url).toContain("wa.me/919876543210");
    expect(url).toContain("Your piano, Young Chang U-121, is due for its tuning on");
    expect(url).toContain("The Piano Services");
  });

  it("offers no message when the tuning isn't due, or the piano isn't rented", async () => {
    seedService(subMonths(today, 1));
    const renderer = await open(<DetailScreen />);

    expect(renderer.root.findAll((node) => node.props.accessibilityLabel === "Message Meera Kapoor about the tuning")).toHaveLength(0);
  });

  it("shows the latest three, and the rest on the full list", async () => {
    for (let i = 1; i <= 4; i++) seedService(subMonths(today, i), i === 1 ? "tuning" : "repair");
    const renderer = await open(<DetailScreen />);

    expect(renderer.root.findAll((node) => typeof node.props.onLongPress === "function" && /^(Tuning|Repair),/.test(node.props.accessibilityLabel ?? ""))).toHaveLength(3);
    await pressLabel(renderer.root, "Show all 4 services");
    expect(router.push).toHaveBeenCalledWith("/service/piano-1");
  });

  it("edits a service after pressing and holding it, with Undo", async () => {
    const toasts = captureToastCalls();
    const id = seedService(subMonths(today, 1), "tuning", { cost: 1200 });
    const renderer = await open(<DetailScreen />);

    await longPress(renderer, "Tuning,");
    await pressLabel(renderer.root, "Edit service");
    await sheetCloses();
    await pressLabel(renderer.root, "Repair");
    await pressLabel(renderer.root, "Save changes");

    expect(fakeBackend.service.get(id)).toMatchObject({ kind: "repair", cost: 1200 });
    const updated = toasts.find((toast) => toast.message === "Service updated")!;
    await act(async () => updated.action!.onPress());
    await flushPromises();
    expect(fakeBackend.service.get(id)).toMatchObject({ kind: "tuning" });
  });

  it("deletes a service after asking, with Undo that brings it back", async () => {
    const toasts = captureToastCalls();
    seedService(subMonths(today, 1), "repair", { note: "Two keys re-felted" });
    const renderer = await open(<DetailScreen />);

    await longPress(renderer, "Repair,");
    await pressLabel(renderer.root, "Delete service");
    await sheetCloses();
    expect(dialogOf(renderer.root)?.title).toBe("Delete this service?");
    await pressDialog(renderer.root, "Delete");
    await flushPromises();

    expect(rows()).toHaveLength(0);
    const deleted = toasts.find((toast) => toast.message === "Service deleted")!;
    await act(async () => deleted.action!.onPress());
    await flushPromises();
    expect(rows()).toEqual([expect.objectContaining({ kind: "repair", note: "Two keys re-felted" })]);
  });

  it("changes the piano's tuning interval, and the next tuning with it", async () => {
    const toasts = captureToastCalls();
    seedService(subMonths(today, 1));
    const renderer = await open(<DetailScreen />);

    await pressLabel(renderer.root, "Tuning interval, Every 6 months");
    await pressLabel(renderer.root, "Every 3 months. Played a lot, or moved often");

    expect(fakeBackend.documents.get("piano-1")).toMatchObject({ tuning_interval_months: 3 });
    expect(toasts).toEqual(expect.arrayContaining([expect.objectContaining({ message: "Tuned every 3 months" })]));
    expect(has(renderer, "Every 3 months")).toBe(true);
    expect(has(renderer, `Next tuning ${format(addMonths(subMonths(today, 1), 3), "d MMM yyyy")}`)).toBe(true);
  });

  it("isn't on a sold piano's page", async () => {
    const renderer = await open(<DetailScreen />, [{ ...rental, sold_date: new Date(2026, 5, 1) as any, category: "on_sale" }]);

    expect(has(renderer, "Service")).toBe(false);
  });
});

describe("when Appwrite can't help", () => {
  it("shows nothing logged when the table isn't there, and says so when a service can't be saved, keeping the sheet open", async () => {
    const toasts = captureToastCalls();
    fakeBackend.missingCollections.add("service_log");
    const renderer = await open(<DetailScreen />);

    expect(has(renderer, "No service logged yet")).toBe(true);
    await pressLabel(renderer.root, "Log service");
    await pressLabel(renderer.root, "Save service");

    expect(toasts).toEqual([expect.objectContaining({ message: "Couldn’t save. Check your connection.", variant: "error" })]);
    const sheet = renderer.root.findAll((node) => node.props.title === "Log service" && "visible" in node.props).pop()!;
    expect(sheet.props.visible).toBe(true);
  });

  it("deletes a piano's service log with the piano", async () => {
    seedService(subMonths(today, 1));
    seedService(subMonths(today, 2), "repair", {}, "piano-9");
    const { deletePianoEntry } = require("@/lib/appwrite");
    fakeBackend.documents.set("piano-1", { ...rental });

    await deletePianoEntry(rental);

    expect(rows().map((row) => row.piano_id)).toEqual(["piano-9"]);
  });
});

describe("Service due on Today", () => {
  it("lists the overdue and soon tunings, opens the piano, and messages a renter", async () => {
    const warehouse = makePiano({ $id: "piano-2", title: "Kawai K-300", category: "warehouse" });
    const later = makePiano({ $id: "piano-3", title: "Petrof P118", category: "warehouse" });
    seedService(subMonths(addDays(today, -12), 6), "tuning", {}, "piano-2");
    seedService(addDays(subMonths(today, 6), 3), "tuning", {}, "piano-1");
    seedService(subMonths(today, 1), "tuning", {}, "piano-3");
    const renderer = await open(<Today />, [rental, warehouse, later]);

    expect(has(renderer, "Service due")).toBe(true);
    const texts = allTexts(renderer.root);
    const due = texts.slice(texts.indexOf("Service due"));
    expect(due.indexOf("Kawai K-300")).toBeLessThan(due.indexOf("Young Chang U-121"));
    expect(has(renderer, "In the warehouse")).toBe(true);
    expect(has(renderer, "Rented to Meera Kapoor")).toBe(true);
    expect(texts.some((text) => text.startsWith("Tuning overdue · was due"))).toBe(true);
    expect(has(renderer, "Petrof P118")).toBe(false);

    await pressLabel(renderer.root, "Message Meera Kapoor about the tuning");
    expect(decodeURIComponent((Linking.openURL as jest.Mock).mock.calls[0][0])).toContain("is due for its tuning on");

    const row = renderer.root.find((node) => typeof node.props.accessibilityLabel === "string" && node.props.accessibilityLabel.startsWith("Kawai K-300, In the warehouse") && typeof node.props.onPress === "function");
    await act(async () => row.props.onPress());
    expect(router.push).toHaveBeenCalledWith("/detail/piano-2");
  });

  it("isn't there when nothing is due", async () => {
    seedService(subMonths(today, 1));
    const renderer = await open(<Today />);

    expect(has(renderer, "Service due")).toBe(false);
  });
});

describe("the full list", () => {
  it("shows a piano's services by year, with the count, the spending and the next tuning", async () => {
    const lastYear = new Date(today.getFullYear() - 1, 5, 10);
    seedService(subMonths(today, 1), "tuning", { cost: 1200 });
    seedService(lastYear, "cleaning");
    seedService(addDays(lastYear, 2), "repair", { cost: 1800 });
    const renderer = await open(<ServiceScreen />);

    const texts = allTexts(renderer.root);
    expect(texts).toEqual(expect.arrayContaining(["Service", "3", "₹3,000", "Next tuning", String(today.getFullYear()), String(today.getFullYear() - 1)]));
    expect(texts.indexOf(String(today.getFullYear()))).toBeLessThan(texts.indexOf(String(today.getFullYear() - 1)));

    await pressLabel(renderer.root, "Log service");
    expect(has(renderer, "Save service")).toBe(true);
  });
});

describe("the 9:00 reminder", () => {
  it("is set for each piano's next tuning still ahead, and gone after signing out", async () => {
    const last = addDays(subMonths(today, 6), 5);
    seedService(last);
    await open(<Today />);
    await flushPromises();

    const service = fakeNotifications.scheduled.filter((notification) => notification.content.data?.type === "service_due");
    expect(service).toHaveLength(1);
    expect(service[0].content).toMatchObject({ title: "Tuning due today", body: "Young Chang U-121, rented to Meera Kapoor." });
    const due = addMonths(last, 6);
    expect(new Date(service[0].trigger.date)).toEqual(new Date(due.getFullYear(), due.getMonth(), due.getDate(), 9, 0, 0, 0));

    const { forgetServiceLog } = require("@/lib/serviceLogStore");
    await act(async () => forgetServiceLog());
    expect(fakeNotifications.scheduled.filter((notification) => notification.content.data?.type === "service_due")).toHaveLength(0);
  });
});

describe("the service section with a big Font size", () => {
  const flat = (style: unknown) => require("react-native").StyleSheet.flatten(style as any);
  /** The innermost view that holds all of the given words */
  const holding = (renderer: ReactTestRenderer, ...words: string[]) =>
    renderer.root
      .findAll((node) => (node.type as unknown) === "View" && words.every((word) => allTexts(node).join("|").includes(word)))
      .pop()!;
  const pressable = (renderer: ReactTestRenderer, label: string) =>
    renderer.root.find((node) => node.props.accessibilityLabel === label && typeof node.props.style === "function");

  beforeEach(() => {
    // Tuned 7 months ago: overdue, so a rented piano also gets the Message button
    seedService(subMonths(today, 7));
  });

  it("puts Log service and Message side by side, each half the width, at 100%", async () => {
    const renderer = await open(<DetailScreen />);

    expect(flat(holding(renderer, "Log service", "Message Meera").props.style).flexDirection).toBe("row");
    expect(flat(pressable(renderer, "Log service").props.style({ pressed: false })).flex).toBe(1);
    expect(flat(pressable(renderer, "Log service").props.style({ pressed: false })).minHeight).toBe(48);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("puts Log service above Message, so neither label is cut", async () => {
      const renderer = await open(<DetailScreen />);

      expect(flat(holding(renderer, "Log service", "Message Meera").props.style).flexDirection).toBe("column");
      expect(flat(pressable(renderer, "Log service").props.style({ pressed: false })).flex).toBeUndefined();
      const message = pressable(renderer, "Message Meera Kapoor about the tuning");
      expect(flat(message.props.style({ pressed: false })).flex).toBeUndefined();
      expect(message.findByType(require("react-native").Text).props.numberOfLines).toBe(2);
    });

    it("lists the numbers on the full service page one line each, as Today does", async () => {
      const renderer = await open(<ServiceScreen />);
      const stats = holding(renderer, "Services", "Spent", "Next tuning");

      expect(flat(stats.props.style).flexDirection).toBe("column");
    });

    it("lets the rows of the press-and-hold sheet grow with their words", async () => {
      seedService(subMonths(today, 1), "repair");
      const renderer = await open(<DetailScreen />);

      await longPress(renderer, "Repair,");
      const edit = pressable(renderer, "Edit service");
      const style = flat(edit.props.style({ pressed: false }));
      expect(style.height).toBeUndefined();
      expect(style.minHeight).toBe(52);
    });
  });

  it("keeps the numbers on the full service page in three columns at 100%", async () => {
    const renderer = await open(<ServiceScreen />);

    expect(flat(holding(renderer, "Services", "Spent", "Next tuning").props.style).flexDirection).toBe("row");
  });
});
