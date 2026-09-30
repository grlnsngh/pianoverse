jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock("@/lib/appwrite", () => ({
  getRentPaymentsBetween: jest.fn(),
}));

import React from "react";
import { AppState, RefreshControl, StyleSheet, Text } from "react-native";
import { act } from "react-test-renderer";
import { Provider } from "react-redux";
import { router } from "expo-router";
import Today from "@/app/(tabs)/today";
import { colors, fonts } from "@/constants/theme";
import { getRentPaymentsBetween } from "@/lib/appwrite";
import { PianoDataContext, PianoLoadStatus, PianoRefresher } from "@/lib/PianoDataContext";
import { makePiano, testUser } from "./helpers/fixtures";
import { advance, hostByTestId, mount, textContent } from "./helpers/ui";
import { allTexts, createTestStore, queryAllByText } from "./helpers/render";

// Tuesday 29 September 2026, the day on the boards
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
  jest.clearAllMocks();
  jest.mocked(getRentPaymentsBetween).mockResolvedValue([]);
});
afterEach(() => {
  jest.useRealTimers();
});

const flat = (style: unknown) => StyleSheet.flatten(style as any);

// Pianos as on the Main board (names are made up)
const rental = (id: string, title: string, customer: string, start: string, end: string, extra = {}) =>
  makePiano({
    $id: id,
    title,
    category: "rentable",
    company_associated: "The Piano Services",
    rental_customer_name: customer,
    rental_period_start: start as any,
    rental_period_end: end as any,
    rental_price: 4000,
    ...extra,
  });
const youngChang = rental("young-chang", "Young Chang U-121", "Meera Kapoor", "2025-03-29", "2025-12-29");
const weber = rental("weber", "Weber W-121", "Karan Malhotra", "2026-08-11", "2026-09-11");
const schimmel = rental("schimmel", "Schimmel W114", "Naina Verma", "2026-08-02", "2026-10-02");
const samick = rental("samick", "Samick SU-118", "Arjun Bedi", "2026-09-01", "2026-10-11");
const petrof = rental("petrof", "Petrof P118", "Sana Qureshi", "2026-09-01", "2026-11-29");
const warehouse = makePiano({ $id: "store", title: "Ronish R-112", category: "warehouse" });
const forSale = makePiano({ $id: "sale", title: "Rameau Upright", category: "on_sale" });
const sold = makePiano({
  $id: "sold",
  title: "Estonia 190",
  category: "on_sale",
  sold_date: "2026-09-10" as any,
  sold_price: 142000,
});
const pianos = [youngChang, weber, schimmel, samick, petrof, warehouse, forSale, sold];

// Saved with the name of whoever had the piano when it was recorded
const payment = (id: string, pianoId: string, paidOn: string, amount: number, customer?: string | null) => ({
  $id: id,
  $createdAt: `${paidOn}T09:00:00.000+00:00`,
  piano_id: pianoId,
  creator: testUser.accountId,
  amount,
  paid_on: paidOn,
  customer_name:
    customer === undefined ? pianos.find((piano) => piano.$id === pianoId)?.rental_customer_name : customer,
});
// Four this month (₹19,000) and two from before
const payments = [
  payment("p-weber", "weber", "2026-09-25", 5000),
  payment("p-samick", "samick", "2026-09-21", 3800),
  payment("p-petrof", "petrof", "2026-09-14", 4000),
  payment("p-schimmel", "schimmel", "2026-09-02", 6200),
  payment("p-aug", "samick", "2026-08-28", 3000),
  payment("p-old", "petrof", "2026-08-10", 2500),
];

type Options = {
  items?: any[];
  paid?: any[];
  status?: PianoLoadStatus;
  refresher?: PianoRefresher | null;
  user?: any;
};

const open = async ({
  items = pianos,
  paid = payments,
  status = "ready",
  refresher = null,
  user = testUser,
}: Options = {}) => {
  jest.mocked(getRentPaymentsBetween).mockResolvedValue(paid);
  const store = createTestStore({ user, items });
  const refresherRef = { current: refresher };
  const tree = (
    <Provider store={store}>
      <PianoDataContext.Provider value={{ status, reportStatus: jest.fn(), refresher: refresherRef }}>
        <Today />
      </PianoDataContext.Provider>
    </Provider>
  );
  const renderer = await mount(tree);
  return { store, renderer, refresherRef };
};

const has = (renderer: any, text: string) => allTexts(renderer.root).includes(text);
const byLabel = (renderer: any, label: string) =>
  renderer.root.findAll(
    (node: any) => node.props.accessibilityLabel === label && typeof node.props.onPress === "function"
  )[0];
const styleOf = (renderer: any, text: string) => flat(queryAllByText(renderer.root, text)[0].props.style);
const cards = (renderer: any) =>
  renderer.root.findAll(
    (node: any) =>
      typeof node.type === "string" &&
      typeof node.props.accessibilityLabel === "string" &&
      node.props.accessibilityHint === "Opens this piano"
  );

describe("the header", () => {
  it("shows today's date above a large Today title", async () => {
    const { renderer } = await open();
    const texts = renderer.root.findAllByType(Text);
    const date = texts.find((text) => textContent(text) === "Tuesday, 29 September")!;
    const title = texts.find((text) => textContent(text) === "Today")!;

    expect(flat(date.props.style)).toMatchObject({
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.ink2,
    });
    expect(flat(title.props.style)).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 32,
      lineHeight: 38,
      color: colors.ink,
    });
  });

  it("follows the calendar", async () => {
    jest.setSystemTime(new Date(2026, 11, 5, 9, 0, 0));
    const { renderer } = await open();

    expect(has(renderer, "Saturday, 5 December")).toBe(true);
  });

  it("works the day out again when the app comes back to the front on a later day", async () => {
    let onChange: (state: string) => void = () => {};
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_event: string, handler: any) => {
      onChange = handler;
      return { remove: jest.fn() };
    }) as any);
    const { renderer } = await open();
    expect(has(renderer, "Tuesday, 29 September")).toBe(true);
    // Weber ended 18 days ago today; tomorrow it is 19
    expect(has(renderer, "Ended 18 days ago")).toBe(true);

    jest.setSystemTime(new Date(2026, 8, 30, 8, 0, 0));
    await act(async () => {
      onChange("active");
    });

    expect(has(renderer, "Wednesday, 30 September")).toBe(true);
    expect(has(renderer, "Ended 19 days ago")).toBe(true);
  });

  it("has the orange + button, which opens the Add screen", async () => {
    const { renderer } = await open();

    byLabel(renderer, "Add piano").props.onPress();

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/create");
  });

  it("is a white page, not the old navy one", async () => {
    const { renderer } = await open();
    const page = renderer.root.findAll(
      (node) => typeof node.type === "string" && flat(node.props.style)?.backgroundColor === colors.page
    );

    expect(page.length).toBeGreaterThan(0);
  });
});

describe("the money", () => {
  it("shows what was received this month, and how many payments made it", async () => {
    const { renderer } = await open();

    expect(has(renderer, "Received in September")).toBe(true);
    expect(has(renderer, "₹19,000")).toBe(true);
    expect(has(renderer, "4 payments so far")).toBe(true);
    expect(styleOf(renderer, "₹19,000")).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 44,
      lineHeight: 50,
    });
  });

  it("names the month it is", async () => {
    jest.setSystemTime(new Date(2026, 9, 3, 9, 0, 0));
    const { renderer } = await open({ paid: payments });

    expect(has(renderer, "Received in October")).toBe(true);
    // Nothing was paid yet in October
    expect(has(renderer, "₹0")).toBe(true);
    expect(has(renderer, "No payments yet")).toBe(true);
  });

  it("says 1 payment, not 1 payments", async () => {
    const { renderer } = await open({ paid: [payment("only", "weber", "2026-09-25", 5000)] });

    expect(has(renderer, "1 payment so far")).toBe(true);
  });

  it("asks for last month's and this month's payments, for the signed-in owner", async () => {
    await open();

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(1);
    const [account, from, to] = jest.mocked(getRentPaymentsBetween).mock.calls[0];
    expect(account).toBe(testUser.accountId);
    expect(from).toEqual(new Date(2026, 7, 1));
    expect(to).toEqual(new Date(2026, 9, 1));
  });

  it("asks for nothing without a signed-in user, and shows no money", async () => {
    const { renderer } = await open({ user: null });

    expect(getRentPaymentsBetween).not.toHaveBeenCalled();
    expect(has(renderer, "₹0")).toBe(true);
  });

  it("shows the three counts: in stock, on rent, and what sold this month", async () => {
    const { renderer } = await open();

    // Only the two pianos that are here are in stock (the warehouse one and the one
    // on sale). Three rentals are on rent; two more ended and haven't come back, so
    // they are with customers too, and in neither count.
    const cell = (label: string) =>
      renderer.root.findAll(
        (node: any) => typeof node.type === "string" && node.props.accessibilityLabel === label
      );
    expect(cell("In stock, 2")).toHaveLength(1);
    expect(cell("On rent, 3")).toHaveLength(1);
    expect(has(renderer, "In stock")).toBe(true);
    expect(has(renderer, "On rent")).toBe(true);
    expect(has(renderer, "₹1,42,000")).toBe(true);
    expect(has(renderer, "Sold this month")).toBe(true);
    expect(styleOf(renderer, "₹1,42,000")).toMatchObject({ fontFamily: fonts.semibold, fontSize: 20 });
  });

  it("says when the payments couldn't be loaded, and keeps showing the rest", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.mocked(getRentPaymentsBetween).mockRejectedValue(new Error("Network request failed"));
    const store = createTestStore({ user: testUser, items: pianos });
    const renderer = await mount(
      <Provider store={store}>
        <Today />
      </Provider>
    );

    expect(has(renderer, "—")).toBe(true);
    expect(has(renderer, "Couldn’t load payments. Pull down to try again.")).toBe(true);
    expect(has(renderer, "₹19,000")).toBe(false);
    expect(has(renderer, "Needs attention")).toBe(true);
    expect(has(renderer, "Recent payments")).toBe(false);
  });
});

describe("Needs attention", () => {
  it("lists what ended, the longest ago first, then what ends within a week", async () => {
    const { renderer } = await open();
    // The first three of the pianos' rows; the shelf comes after them
    const rows = cards(renderer).slice(0, 3);

    expect(rows.map((node: any) => node.props.accessibilityLabel)).toEqual([
      "Young Chang U-121, Meera Kapoor, Ended 9 months ago",
      "Weber W-121, Karan Malhotra, Ended 18 days ago",
      "Schimmel W114, Naina Verma, Ends in 3 days",
    ]);
  });

  it("counts them next to the title", async () => {
    const { renderer } = await open();

    expect(has(renderer, "Needs attention")).toBe(true);
    expect(has(renderer, "3")).toBe(true);
  });

  it("colours the status: red once ended, orange when it is about to", async () => {
    const { renderer } = await open();

    expect(styleOf(renderer, "Ended 9 months ago")).toMatchObject({ color: colors.late, fontFamily: fonts.semibold });
    expect(styleOf(renderer, "Ended 18 days ago")).toMatchObject({ color: colors.late });
    expect(styleOf(renderer, "Ends in 3 days")).toMatchObject({ color: colors.brandText });
  });

  it("opens a piano's page when its row is pressed", async () => {
    const { renderer } = await open();

    byLabel(renderer, "Weber W-121, Karan Malhotra, Ended 18 days ago").props.onPress();

    expect(router.push).toHaveBeenCalledWith("/detail/weber");
  });

  it("leaves out a rental with no customer name from the name line only", async () => {
    const nameless = rental("nameless", "Yamaha C3", "", "2026-09-01", "2026-09-20");
    const { renderer } = await open({ items: [nameless] });

    expect(byLabel(renderer, "Yamaha C3, Ended 9 days ago")).toBeDefined();
  });

  it("says nothing needs attention when every rental is comfortably on time", async () => {
    const { renderer } = await open({ items: [samick, petrof, warehouse] });

    expect(has(renderer, "Nothing needs your attention.")).toBe(true);
    // No "0" beside the title: only the counts under the money show digits
    expect(has(renderer, "0")).toBe(false);
  });

  it("says to add a piano when there are none", async () => {
    const { renderer } = await open({ items: [] });

    expect(has(renderer, "No pianos yet. Add one with the + button.")).toBe(true);
  });
});

describe("Rented out", () => {
  it("shows the rentals that are out, the one ending soonest first", async () => {
    const { renderer } = await open();
    const shelf = cards(renderer).filter((node: any) => /Samick|Petrof|Schimmel/.test(node.props.accessibilityLabel));

    // Schimmel is also in Needs attention, so it appears twice: list row, then card
    expect(shelf.map((node: any) => node.props.accessibilityLabel)).toEqual([
      "Schimmel W114, Naina Verma, Ends in 3 days",
      "Schimmel W114, Naina Verma, Ends in 3 days",
      "Samick SU-118, Arjun Bedi, 12 days left",
      "Petrof P118, Sana Qureshi, 2 months left",
    ]);
    expect(styleOf(renderer, "12 days left")).toMatchObject({ color: colors.ink2 });
  });

  it("draws how far through its period each rental is, along the bottom of its photo", async () => {
    const { renderer } = await open();
    const fills = renderer.root.findAll(
      (node: any) => typeof node.type === "string" && node.props.testID === "shelf-progress-fill"
    );

    // Schimmel 58 of 61 days, Samick 28 of 40, Petrof 28 of 89
    expect(fills.map((node: any) => flat(node.props.style).width)).toEqual(["95%", "70%", "31%"]);
    expect(fills.map((node: any) => flat(node.props.style).backgroundColor)).toEqual([colors.brand, colors.brand, colors.brand]);
    const track = hostByTestId(renderer.root, "shelf-progress-track");
    expect(flat(track.props.style)).toMatchObject({ height: 5, backgroundColor: colors.progressTrack });
  });

  it("draws no bar for a rental with no start date", async () => {
    const open1 = rental("open", "Kawai K-300", "Zoya", "", "2026-12-01", { rental_period_start: null });
    const { renderer } = await open({ items: [open1] });

    expect(byLabel(renderer, "Kawai K-300, Zoya, 2 months left")).toBeDefined();
    expect(
      renderer.root.findAll((node: any) => node.props.testID === "shelf-progress-fill")
    ).toHaveLength(0);
  });

  it("opens a piano's page when its card is pressed", async () => {
    const { renderer } = await open();

    byLabel(renderer, "Samick SU-118, Arjun Bedi, 12 days left").props.onPress();

    expect(router.push).toHaveBeenCalledWith("/detail/samick");
  });

  it("goes to the Pianos tab showing the rentals that are out, from See all", async () => {
    const { store, renderer } = await open();

    byLabel(renderer, "See all rented out pianos").props.onPress();

    expect(store.getState().navigation.activeTab).toBe("pianos");
    const { filters } = store.getState().pianos;
    expect(filters.category).toBe("Rentable");
    expect(filters.isActiveRentals).toBe(true);
    expect(filters.isOverdue).toBe(false);
  });

  it("is left out when nothing is on rent", async () => {
    const { renderer } = await open({ items: [warehouse, youngChang] });

    expect(has(renderer, "Rented out")).toBe(false);
    expect(byLabel(renderer, "See all rented out pianos")).toBeUndefined();
  });
});

describe("Recent payments", () => {
  it("lists the five latest, newest first, with who paid, for which piano, when, and how much", async () => {
    const { renderer } = await open();
    const rows = renderer.root.findAll(
      (node: any) =>
        typeof node.type === "string" &&
        node.props.accessible === true &&
        / · .*₹[\d,]+$/.test(node.props.accessibilityLabel ?? "")
    );

    expect(rows.map((node: any) => node.props.accessibilityLabel)).toEqual([
      "Karan Malhotra, Weber W-121 · 25 Sep, ₹5,000",
      "Arjun Bedi, Samick SU-118 · 21 Sep, ₹3,800",
      "Sana Qureshi, Petrof P118 · 14 Sep, ₹4,000",
      "Naina Verma, Schimmel W114 · 2 Sep, ₹6,200",
      "Arjun Bedi, Samick SU-118 · 28 Aug, ₹3,000",
    ]);
  });

  it("shows the name saved with a payment, not the name of whoever has the piano now", async () => {
    const { renderer } = await open({ paid: [payment("june", "weber", "2026-09-25", 5000, "Asha Mehta")] });

    const rows = renderer.root.findAll(
      (node: any) => typeof node.type === "string" && / · .*₹[\d,]+$/.test(node.props.accessibilityLabel ?? "")
    );
    // Weber is rented to Karan Malhotra now (Needs attention says so), but this payment says who paid it
    expect(rows.map((node: any) => node.props.accessibilityLabel)).toEqual(["Asha Mehta, Weber W-121 · 25 Sep, ₹5,000"]);
  });

  it("shows the piano's title for a payment recorded before names were saved", async () => {
    const { renderer } = await open({ paid: [payment("old", "weber", "2026-09-25", 5000, null)] });

    expect(allTexts(renderer.root)).toContain("Weber W-121");
    expect(
      renderer.root.findAll(
        (node: any) => node.props.accessibilityLabel === "Weber W-121, 25 Sep, ₹5,000"
      ).length
    ).toBeGreaterThan(0);
  });

  it("shows the amounts with lined-up digits", async () => {
    const { renderer } = await open();

    expect(styleOf(renderer, "₹5,000")).toMatchObject({ fontFamily: fonts.semibold, fontSize: 16 });
    expect(styleOf(renderer, "₹5,000").fontVariant).toEqual(["tabular-nums"]);
  });

  it("is left out when there are no payments", async () => {
    const { renderer } = await open({ paid: [] });

    expect(has(renderer, "Recent payments")).toBe(false);
  });
});

describe("sizes and colours from the Main board", () => {
  const boxes = (renderer: any, width: number, height: number, radius: number) =>
    renderer.root.findAll((node: any) => {
      if (typeof node.type !== "string") return false;
      const style = flat(node.props.style);
      return style?.width === width && style?.height === height && style?.borderRadius === radius;
    });

  it("draws the rows' photos 64 square with a 12 radius", async () => {
    const { renderer } = await open();

    // Three rows that need attention, plus the payments have none
    expect(boxes(renderer, 64, 64, 12)).toHaveLength(3);
  });

  it("draws the shelf's photos 244 by 152 with a 16 radius", async () => {
    const { renderer } = await open();

    expect(boxes(renderer, 244, 152, 16)).toHaveLength(3);
  });

  it("sets the section titles at 20 / 26 bold, and See all in the orange for text", async () => {
    const { renderer } = await open();

    expect(styleOf(renderer, "Needs attention")).toMatchObject({ fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink });
    expect(styleOf(renderer, "Rented out")).toMatchObject({ fontFamily: fonts.bold, fontSize: 20 });
    expect(styleOf(renderer, "Recent payments")).toMatchObject({ fontFamily: fonts.bold, fontSize: 20 });
    expect(styleOf(renderer, "See all")).toMatchObject({ fontFamily: fonts.semibold, fontSize: 14, color: colors.brandText });
  });

  it("gives the sold-this-month column more room than the other two counts", async () => {
    const { renderer } = await open();
    const cells = renderer.root.findAll(
      (node: any) => typeof node.type === "string" && /^(In stock|On rent|Sold this month), /.test(node.props.accessibilityLabel ?? "")
    );

    expect(cells.map((node: any) => flat(node.props.style).flex)).toEqual([1, 1, 1.3]);
  });

  it("puts a hairline under each row, and a rule above the counts", async () => {
    const { renderer } = await open();
    const rules = renderer.root.findAll(
      (node: any) =>
        typeof node.type === "string" &&
        (flat(node.props.style)?.borderBottomColor === colors.hairline ||
          flat(node.props.style)?.borderTopColor === colors.hairline)
    );

    // Above the counts, three attention rows, five payments
    expect(rules).toHaveLength(1 + 3 + 5);
  });

  it("gives every section title the heading role, for screen readers", async () => {
    const { renderer } = await open();
    const headings = renderer.root.findAll(
      (node: any) => typeof node.type === "string" && node.props.accessibilityRole === "header"
    );

    expect(headings.map(textContent)).toEqual(["Needs attention", "Rented out", "Recent payments"]);
  });
});

describe("loading", () => {
  const pending = () => {
    let resolve!: (value: any[]) => void;
    const promise = new Promise<any[]>((done) => {
      resolve = done;
    });
    jest.mocked(getRentPaymentsBetween).mockReturnValue(promise as any);
    return resolve;
  };
  const skeleton = (renderer: any) =>
    renderer.root.findAll((node: any) => node.props.testID === "today-skeleton").length > 0;

  it("shows nothing but the + for the first 200 ms, then the skeleton, and never a flash for a quick load", async () => {
    const resolve = pending();
    const store = createTestStore({ user: testUser, items: pianos });
    const renderer = await mount(
      <Provider store={store}>
        <Today />
      </Provider>
    );

    expect(skeleton(renderer)).toBe(false);
    expect(has(renderer, "Today")).toBe(false);
    expect(byLabel(renderer, "Add piano")).toBeDefined();

    await advance(200);
    expect(skeleton(renderer)).toBe(true);
    expect(byLabel(renderer, "Add piano")).toBeDefined();

    await act(async () => {
      resolve(payments);
    });
    expect(skeleton(renderer)).toBe(false);
    expect(has(renderer, "Needs attention")).toBe(true);
  });

  it("shows no skeleton at all when the payments arrive within 200 ms", async () => {
    const { renderer } = await open();

    await advance(500);

    expect(skeleton(renderer)).toBe(false);
    expect(has(renderer, "₹19,000")).toBe(true);
  });

  it("waits, too, while the pianos load for the first time, with none saved on the phone", async () => {
    const { renderer } = await open({ items: [], status: "loading" });

    await advance(250);

    expect(skeleton(renderer)).toBe(true);
    expect(has(renderer, "Needs attention")).toBe(false);
  });

  it("shows the pianos that are saved on the phone without waiting for the server", async () => {
    const { renderer } = await open({ status: "loading" });

    await advance(250);

    expect(skeleton(renderer)).toBe(false);
    expect(has(renderer, "Needs attention")).toBe(true);
  });

  it("doesn't bring the skeleton back on a later reload", async () => {
    const resolveFirst = pending();
    const store = createTestStore({ user: testUser, items: [] });
    const renderer = await mount(
      <Provider store={store}>
        <Today />
      </Provider>
    );
    await act(async () => {
      resolveFirst([]);
    });
    expect(has(renderer, "Today")).toBe(true);

    const control = renderer.root.findByType(RefreshControl);
    const resolveSecond = pending();
    await act(async () => {
      control.props.onRefresh();
    });
    await advance(500);

    expect(skeleton(renderer)).toBe(false);
    expect(has(renderer, "Today")).toBe(true);
    await act(async () => {
      resolveSecond([]);
    });
  });
});

describe("pulling down to refresh", () => {
  it("uses the system's spinner, drawn in the app's ink colour", async () => {
    const { renderer } = await open();

    const control = renderer.root.findByType(RefreshControl);
    expect(control.props.tintColor).toBe(colors.ink);
    expect(control.props.colors).toEqual([colors.ink]);
    expect(control.props.progressBackgroundColor).toBe(colors.white);
    expect(control.props.refreshing).toBe(false);
  });

  it("loads the pianos again, through the Pianos tab, and the payments", async () => {
    const refresher = jest.fn(() => Promise.resolve());
    const { renderer } = await open({ refresher });
    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(1);

    await act(async () => {
      await renderer.root.findByType(RefreshControl).props.onRefresh();
    });

    expect(refresher).toHaveBeenCalledTimes(1);
    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(2);
  });

  it("spins until both have finished", async () => {
    let finishPianos!: () => void;
    const refresher = jest.fn(
      () =>
        new Promise<void>((done) => {
          finishPianos = done;
        })
    );
    const { renderer } = await open({ refresher });

    await act(async () => {
      renderer.root.findByType(RefreshControl).props.onRefresh();
    });
    expect(renderer.root.findByType(RefreshControl).props.refreshing).toBe(true);

    await act(async () => {
      finishPianos();
    });
    expect(renderer.root.findByType(RefreshControl).props.refreshing).toBe(false);
  });

  it("still reloads the payments when the Pianos tab hasn't registered a reload", async () => {
    const { renderer } = await open({ refresher: null });

    await act(async () => {
      await renderer.root.findByType(RefreshControl).props.onRefresh();
    });

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByType(RefreshControl).props.refreshing).toBe(false);
  });
});
