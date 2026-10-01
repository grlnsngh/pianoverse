jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
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
  useNavigation: jest.fn(() => ({ setOptions: jest.fn(), addListener: jest.fn(() => jest.fn()) })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));

import React from "react";
import { addDays } from "date-fns";
import { StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act, ReactTestRenderer } from "react-test-renderer";
import { Provider } from "react-redux";
import { router } from "expo-router";
import DetailScreen from "@/app/detail/[id]";
import { lightColors as colors, fonts } from "@/constants/theme";
import { PianoDataContext, PianoLoadStatus } from "@/lib/PianoDataContext";
import { setPianoListItems } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import { advance, mount, textContent } from "./helpers/ui";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  dialogOf,
  flushPromises,
  pressDialog,
  queryAllByText,
  renderWithStore,
} from "./helpers/render";

const inDays = (days: number) => toStoredDate(addDays(new Date(), days)) as any;
const flat = (style: unknown) => StyleSheet.flatten(style as any);

const rented = (endsIn: number, overrides: Record<string, unknown> = {}) =>
  makePiano({
    $id: "piano-1",
    title: "Young Chang U-121",
    make: "Young Chang",
    company_associated: "The Piano Services",
    category: "rentable",
    description: "Upright, walnut finish.",
    date_of_purchase: "2023-08-14" as any,
    rental_customer_name: "Meera Kapoor",
    rental_customer_mobile: "+91 98765 43210",
    rental_customer_address: "B-42, Sector 21, Chandigarh",
    rental_period_start: inDays(endsIn - 30),
    rental_period_end: inDays(endsIn),
    rental_price: 4500,
    ...overrides,
  } as any);
const onSale = makePiano({
  $id: "piano-1",
  title: "Kreutzer K-108",
  make: "Kreutzer",
  company_associated: "RS Music Center",
  category: "on_sale",
  on_sale_price: 95000,
  on_sale_purchase_from: "Mehta Traders",
  on_sale_import_date: "2026-06-02" as any,
  date_of_purchase: "2026-05-18" as any,
  description: "Mahogany finish. Recently tuned.",
});
const events = makePiano({
  $id: "piano-1",
  title: "Steinway D",
  make: "Steinway",
  company_associated: "Shamshersons",
  category: "events",
  event_purchase_price: 780000,
  event_purchase_from: "Bose Pianos",
  event_model_number: "Model D",
  event_b_number: "B-12/34",
});
const warehouse = makePiano({
  $id: "piano-1",
  title: "Ronish R-112",
  make: "Ronish",
  category: "warehouse",
  warehouse_since_date: "2026-03-05" as any,
});
const sold = makePiano({
  $id: "piano-1",
  title: "Zimmermann Z-121",
  make: "Zimmermann",
  company_associated: "Shamshersons",
  category: "rentable",
  sold_date: "2026-09-14" as any,
  sold_price: 142000,
  sold_to_name: "Vikram Sethi",
  sold_to_address: "22, Civil Lines, Jalandhar",
  rental_customer_name: "Meera Kapoor",
});

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(router.canGoBack).mockReturnValue(true);
  fakeBackend.reset();
  alerts = captureAlerts();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

const open = async (piano: PianoItem) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await flushPromises();
  return { store, renderer };
};

// One entry per control: a pressable is more than one node in the test tree
const isControl = (label: string) => (node: any) =>
  node?.props.accessibilityLabel === label && typeof node.props.onPress === "function";
const labelled = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll((node) => isControl(label)(node) && !isControl(label)(node.parent));
const press = async (renderer: ReactTestRenderer, label: string) => {
  const [node] = labelled(renderer, label);
  if (!node) throw new Error(`Nothing labelled "${label}"`);
  await act(async () => {
    await node.props.onPress();
  });
};
const textStyle = (renderer: ReactTestRenderer, text: string) =>
  flat(queryAllByText(renderer.root, text)[0].props.style);
const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);
const byTestId = (renderer: ReactTestRenderer, id: string) =>
  renderer.root.findAll((node) => typeof node.type === "string" && node.props.testID === id);
const photos = ["a", "b", "c"].map(fileViewUrl);

describe("the photo at the top", () => {
  it("has Back, Share and ⋯ buttons on the photo", async () => {
    const { renderer } = await open(rented(10));

    expect(labelled(renderer, "Back to pianos")).toHaveLength(1);
    expect(labelled(renderer, "Share")).toHaveLength(1);
    expect(labelled(renderer, "More options")).toHaveLength(1);
  });

  it("goes back, or to the Pianos tab when there is nothing to go back to", async () => {
    const { renderer } = await open(rented(10));

    await press(renderer, "Back to pianos");
    expect(router.back).toHaveBeenCalledTimes(1);

    jest.mocked(router.canGoBack).mockReturnValue(false);
    await press(renderer, "Back to pianos");
    expect(router.replace).toHaveBeenCalledWith("/home");
  });

  it("is 340 high, with the piano drawing when there is no photo", async () => {
    const { renderer } = await open(rented(10, { image_url: "" }));

    expect(flat(byTestId(renderer, "photo-hero")[0].props.style).height).toBe(340);
    expect(renderer.root.findAll((node) => node.props.viewBox === "0 0 160 160").length).toBeGreaterThan(0);
    // Nothing to open
    expect(labelled(renderer, "Open photo 1")).toHaveLength(0);
  });

  it("counts several photos as '1 / 3', in a dark pill, and says nothing for one", async () => {
    const { renderer } = await open(rented(10, { image_url: photos[0], image_urls: photos }));
    const [counter] = byTestId(renderer, "photo-counter");

    expect(textContent(counter)).toBe("1 / 3");
    expect(flat(counter.props.style)).toMatchObject({
      backgroundColor: colors.photoScrim,
      right: 16,
      bottom: 40,
      borderRadius: 999,
    });

    const single = await open(rented(10, { image_url: photos[0], image_urls: [photos[0]] }));
    expect(byTestId(single.renderer, "photo-counter")).toHaveLength(0);
  });

  it("draws the Back, Share and ⋯ buttons as 44 px white circles", async () => {
    const { renderer } = await open(rented(10));

    [["Back to pianos", { left: 16 }], ["Share", { right: 68 }], ["More options", { right: 16 }]].forEach(
      ([label, position]) => {
        const style = flat(labelled(renderer, label as string)[0].props.style({ pressed: false }));
        expect(style).toMatchObject({
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.white,
          top: 12,
          ...(position as object),
        });
      }
    );
  });

  it("washes out a sold piano's photo and marks it SOLD, with no Share button", async () => {
    const { renderer } = await open(sold);

    expect(byTestId(renderer, "sold-wash")).toHaveLength(1);
    expect(flat(byTestId(renderer, "sold-wash")[0].props.style).backgroundColor).toBe(colors.soldWash);
    expect(textContent(byTestId(renderer, "sold-badge")[0])).toBe("SOLD");
    expect(flat(byTestId(renderer, "sold-badge")[0].props.style)).toMatchObject({ backgroundColor: colors.ink, left: 16 });
    expect(labelled(renderer, "Share")).toHaveLength(0);
  });

  it("has no SOLD badge or wash on a piano that hasn't been sold", async () => {
    const { renderer } = await open(rented(10));

    expect(byTestId(renderer, "sold-wash")).toHaveLength(0);
    expect(byTestId(renderer, "sold-badge")).toHaveLength(0);
  });
});

describe("the title block", () => {
  it("has the title at 28 / 34 and the category, make and company under it", async () => {
    const { renderer } = await open(rented(10));

    expect(textStyle(renderer, "Young Chang U-121")).toMatchObject({ fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.ink });
    expect(textStyle(renderer, "Rentable · Young Chang · The Piano Services")).toMatchObject({
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.ink2,
    });
  });

  it("says how long ago an ended rental ended, in red, with a red dot", async () => {
    const { renderer } = await open(rented(-18));

    expect(has(renderer, "Rental ended 18 days ago")).toBe(true);
    expect(textStyle(renderer, "Rental ended 18 days ago")).toMatchObject({ color: colors.late, fontFamily: fonts.semibold, fontSize: 15 });
    const dot = renderer.root.findAll(
      (node) => typeof node.type === "string" && flat(node.props.style)?.width === 8 && flat(node.props.style)?.borderRadius === 4
    );
    expect(dot).toHaveLength(1);
    expect(flat(dot[0].props.style).backgroundColor).toBe(colors.late);
  });

  it("says a rental ending soon in orange, and one with time left in grey", async () => {
    const soon = await open(rented(3));
    expect(textStyle(soon.renderer, "Rental ends in 3 days").color).toBe(colors.brandText);

    const later = await open(rented(40));
    expect(textStyle(later.renderer, "Rental ends in 40 days").color).toBe(colors.ink2);
  });

  it("shows a piano on sale's asking price large, and no status line", async () => {
    const { renderer } = await open(onSale);

    expect(textStyle(renderer, "₹95,000")).toMatchObject({ fontFamily: fonts.bold, fontSize: 32, lineHeight: 38 });
    expect(has(renderer, "On sale · Kreutzer · RS Music Center")).toBe(true);
  });

  it("says when a sold piano was sold, plain, and 'Was …' in the line under the title", async () => {
    const { renderer } = await open(sold);

    expect(has(renderer, "Was rentable · Zimmermann · Shamshersons")).toBe(true);
    expect(has(renderer, "Sold on 14 Sep 2026")).toBe(true);
    expect(textStyle(renderer, "Sold on 14 Sep 2026").color).toBe(colors.ink);
  });

  it("has the title as a heading, for screen readers", async () => {
    const { renderer } = await open(rented(10));
    const headings = renderer.root.findAll(
      (node) => typeof node.type === "string" && node.props.accessibilityRole === "header"
    );

    expect(headings.map(textContent)).toEqual(
      expect.arrayContaining(["Young Chang U-121", "Rental", "Payments", "About this piano"])
    );
  });
});

describe("a rented piano's sections", () => {
  it("shows who has it, with their initials and number", async () => {
    const { renderer } = await open(rented(-18));

    expect(has(renderer, "Rental")).toBe(true);
    expect(has(renderer, "MK")).toBe(true);
    expect(has(renderer, "Meera Kapoor")).toBe(true);
    expect(has(renderer, "+91 98765 43210")).toBe(true);
    expect(textStyle(renderer, "MK")).toMatchObject({ fontFamily: fonts.bold, fontSize: 16 });
  });

  it("has a 44 px call button and a WhatsApp button beside them", async () => {
    const { renderer } = await open(rented(10));

    ["Call Meera Kapoor", "Message on WhatsApp"].forEach((label) => {
      const style = flat(labelled(renderer, label)[0].props.style({ pressed: false }));
      expect(style).toMatchObject({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.controlBorder });
    });
  });

  it("shows a person icon instead of initials when the customer has no name", async () => {
    const { renderer } = await open(rented(10, { rental_customer_name: "" }));

    expect(has(renderer, "MK")).toBe(false);
    expect(has(renderer, "+91 98765 43210")).toBe(true);
  });

  it("draws the rental's length as a bar: ink for what has passed, then red for the days over an ended rental", async () => {
    const { renderer } = await open(rented(-18));
    const [done] = byTestId(renderer, "rental-bar-done");
    const [rest] = byTestId(renderer, "rental-bar-rest");

    expect(flat(done.props.style)).toMatchObject({ flex: 30, backgroundColor: colors.ink });
    expect(flat(rest.props.style)).toMatchObject({ flex: 18, backgroundColor: colors.late });
  });

  it("draws a running rental's bar grey after the days gone", async () => {
    const { renderer } = await open(rented(10));
    const [done] = byTestId(renderer, "rental-bar-done");
    const [rest] = byTestId(renderer, "rental-bar-rest");

    expect(flat(done.props.style).flex).toBe(20);
    expect(flat(rest.props.style)).toMatchObject({ flex: 10, backgroundColor: colors.hairline });
  });

  it("has only the full segment on the last day", async () => {
    const { renderer } = await open(rented(0));

    expect(byTestId(renderer, "rental-bar-done")).toHaveLength(1);
    expect(byTestId(renderer, "rental-bar-rest")).toHaveLength(0);
  });

  it("puts the start and end dates under the bar, with 'Started' and how long over or left", async () => {
    const { renderer } = await open(rented(-18));

    expect(has(renderer, "Started")).toBe(true);
    expect(has(renderer, "Ended · 18 days over")).toBe(true);
    expect(textStyle(renderer, "Ended · 18 days over").color).toBe(colors.late);
    expect(textStyle(renderer, "Started").color).toBe(colors.ink2);
  });

  it("shows the rent in bold and the address", async () => {
    const { renderer } = await open(rented(10));

    expect(has(renderer, "Rent")).toBe(true);
    expect(textStyle(renderer, "₹4,500")).toMatchObject({ fontFamily: fonts.bold });
    expect(has(renderer, "Address")).toBe(true);
    expect(has(renderer, "B-42, Sector 21, Chandigarh")).toBe(true);
  });

  it("has no Rental section for a rental with nothing recorded about it", async () => {
    const { renderer } = await open(
      rented(10, {
        rental_customer_name: null,
        rental_customer_mobile: null,
        rental_customer_address: null,
        rental_period_start: null,
        rental_period_end: null,
        rental_price: null,
      })
    );

    expect(has(renderer, "Rental")).toBe(false);
    expect(has(renderer, "Payments")).toBe(true);
  });

  it("has About this piano with make, company and purchase date, and the description", async () => {
    const { renderer } = await open(rented(10));

    expect(has(renderer, "About this piano")).toBe(true);
    expect(has(renderer, "Purchased")).toBe(true);
    expect(has(renderer, "14 Aug 2023")).toBe(true);
    expect(has(renderer, "Upright, walnut finish.")).toBe(true);
    expect(textStyle(renderer, "Upright, walnut finish.")).toMatchObject({ fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 });
  });
});

describe("the other categories", () => {
  it("shows a piano on sale's details, and no rental or payments", async () => {
    const { renderer } = await open(onSale);

    ["Details", "Make", "Kreutzer", "Company", "RS Music Center", "Bought from", "Mehta Traders", "Imported", "2 Jun 2026", "Purchased", "18 May 2026", "Mahogany finish. Recently tuned."].forEach(
      (text) => expect(has(renderer, text)).toBe(true)
    );
    expect(has(renderer, "Rental")).toBe(false);
    expect(has(renderer, "Payments")).toBe(false);
  });

  it("shows an events piano's price, where it was bought, its model number and its B number", async () => {
    const { renderer } = await open(events);

    ["Details", "Purchase price", "₹7,80,000", "Bought from", "Bose Pianos", "Model number", "Model D", "B number", "B-12/34"].forEach(
      (text) => expect(has(renderer, text)).toBe(true)
    );
  });

  it("shows since when a warehouse piano has been stored", async () => {
    const { renderer } = await open(warehouse);

    expect(has(renderer, "Stored since")).toBe(true);
    expect(has(renderer, "5 Mar 2026")).toBe(true);
  });

  it("asks nothing of the payments for a piano that isn't rented", async () => {
    await open(warehouse);

    expect(fakeBackend.listCalls).toEqual([]);
  });

  it("shows a sold piano's sale, and keeps the payments it took while rented", async () => {
    fakeBackend.payments.set("p", {
      $id: "p",
      $createdAt: "2026-09-01T00:00:00.000+00:00",
      piano_id: "piano-1",
      creator: testUser.accountId,
      amount: 5000,
      paid_on: "2026-08-05",
    });
    const { renderer } = await open(sold);

    ["Sale", "Price", "₹1,42,000", "Buyer", "Vikram Sethi", "Address", "22, Civil Lines, Jalandhar", "Sold on", "14 Sep 2026", "About this piano"].forEach(
      (text) => expect(has(renderer, text)).toBe(true)
    );
    expect(textStyle(renderer, "₹1,42,000")).toBeDefined();
    expect(has(renderer, "Rental")).toBe(false);
    expect(has(renderer, "Payments")).toBe(true);
    expect(has(renderer, "₹5,000 received · 1 payment")).toBe(true);
  });
});

describe("the actions at the bottom of the page", () => {
  const listRows = (renderer: ReactTestRenderer, labels: string[]) =>
    labels.map((label) => labelled(renderer, label).length);

  it("lists Extend rental, Edit piano, Mark as sold and Delete piano for a rental", async () => {
    const { renderer } = await open(rented(10));

    expect(listRows(renderer, ["Extend rental", "Edit piano", "Mark as sold", "Delete piano"])).toEqual([1, 1, 1, 1]);
    expect(labelled(renderer, "Undo sale")).toHaveLength(0);
  });

  it("has Delete piano in red, and no arrow on it", async () => {
    const { renderer } = await open(rented(10));

    expect(textStyle(renderer, "Delete piano").color).toBe(colors.late);
    expect(textStyle(renderer, "Extend rental").color).toBe(colors.ink);
    const [deleteRow] = labelled(renderer, "Delete piano");
    const [editRow] = labelled(renderer, "Edit piano");
    expect(deleteRow.findAll((node) => node.props.viewBox === "0 0 24 24")).toHaveLength(0);
    expect(editRow.findAll((node) => node.props.viewBox === "0 0 24 24").length).toBeGreaterThan(0);
  });

  it("lists only Edit piano and Delete piano for a piano on sale, whose main action is in the bar", async () => {
    const { renderer } = await open(onSale);

    expect(listRows(renderer, ["Edit piano", "Delete piano", "Extend rental"])).toEqual([1, 1, 0]);
    // Mark as sold is the bar's button, so it is there once
    expect(labelled(renderer, "Mark as sold")).toHaveLength(1);
  });

  it("lists Mark as sold and Delete piano for events and the warehouse, with Edit piano in the bar", async () => {
    for (const piano of [events, warehouse]) {
      const { renderer } = await open(piano);
      expect(listRows(renderer, ["Mark as sold", "Delete piano", "Edit piano"])).toEqual([1, 1, 1]);
    }
  });

  it("lists Edit piano and Delete piano for a sold piano, with Undo sale in the bar", async () => {
    const { renderer } = await open(sold);

    expect(listRows(renderer, ["Edit piano", "Delete piano", "Undo sale", "Mark as sold", "Extend rental"])).toEqual([1, 1, 1, 0, 0]);
  });

  it("opens the Edit screen from Edit piano", async () => {
    const { renderer } = await open(onSale);

    await press(renderer, "Edit piano");

    expect(router.push).toHaveBeenCalledWith("/edit/piano-1");
  });
});

describe("the bar at the bottom", () => {
  const bar = (renderer: ReactTestRenderer) => byTestId(renderer, "sticky-action-bar")[0];
  const barTexts = (renderer: ReactTestRenderer) =>
    bar(renderer).findAllByType(Text).map(textContent);

  it("shows the rent, 'Rent overdue' in red, and Record payment for an ended rental", async () => {
    const { renderer } = await open(rented(-18));

    expect(barTexts(renderer)).toEqual(["₹4,500", "Rent overdue", "Record payment"]);
    expect(flat(bar(renderer).findAllByType(Text)[1].props.style)).toMatchObject({ color: colors.late, fontFamily: fonts.semibold, fontSize: 13 });
    expect(flat(bar(renderer).findAllByType(Text)[0].props.style)).toMatchObject({ fontFamily: fonts.bold, fontSize: 18 });
  });

  it("says how soon a rental ends in orange, and how long it has left in grey", async () => {
    const soon = await open(rented(3));
    expect(barTexts(soon.renderer)).toContain("Ends in 3 days");
    expect(flat(soon.renderer.root.findAllByType(Text).find((t) => textContent(t) === "Ends in 3 days")!.props.style).color).toBe(colors.brandText);

    const later = await open(rented(40));
    expect(barTexts(later.renderer)).toContain("40 days left");
  });

  it("shows the asking price and 'Listed for sale' with Mark as sold", async () => {
    const { renderer } = await open(onSale);

    expect(barTexts(renderer)).toEqual(["₹95,000", "Listed for sale", "Mark as sold"]);
  });

  it("shows Edit piano for events and the warehouse", async () => {
    expect(barTexts((await open(events)).renderer)).toEqual(["₹7,80,000", "Event stock", "Edit piano"]);
    expect(barTexts((await open(warehouse)).renderer)).toEqual(["Stored since Mar 2026", "Edit piano"]);
  });

  it("shows what a sold piano sold for, with a quiet Undo sale", async () => {
    const { renderer } = await open(sold);

    expect(barTexts(renderer)).toEqual(["₹1,42,000", "Sold", "Undo sale"]);
    const [undo] = labelled(renderer, "Undo sale");
    expect(flat(undo.props.style({ pressed: false })).backgroundColor).toBe(colors.fill);
  });

  it("uses the orange button for the action that leads", async () => {
    const { renderer } = await open(rented(10));
    const [record] = labelled(renderer, "Record payment");

    expect(flat(record.props.style({ pressed: false })).backgroundColor).toBe(colors.brand);
    expect(flat(record.props.style({ pressed: false })).height).toBe(48);
  });

  it("is as tall as the tab bar: 50 above the home indicator, at least 8 below it", async () => {
    const { renderer } = await open(rented(10));

    expect(flat(bar(renderer).props.style)).toMatchObject({ height: 58, paddingBottom: 8, borderTopWidth: 1, borderTopColor: colors.hairline });
  });

  it("opens the payment sheet from Record payment", async () => {
    const { renderer } = await open(rented(10));

    await press(renderer, "Record payment");

    expect(
      renderer.root.findAll((node) => node.props.accessibilityLabel === "Amount" && typeof node.props.onChangeText === "function").length
    ).toBeGreaterThan(0);
  });

  it("opens the sale sheet from Mark as sold, and asks before undoing a sale", async () => {
    const onSaleScreen = await open(onSale);
    await press(onSaleScreen.renderer, "Mark as sold");
    expect(
      onSaleScreen.renderer.root.findAll((node) => node.props.accessibilityLabel === "Sale price" && typeof node.props.onChangeText === "function").length
    ).toBeGreaterThan(0);

    const soldScreen = await open(sold);
    await press(soldScreen.renderer, "Undo sale");
    expect(dialogOf(soldScreen.renderer.root)).toEqual({
      title: "Undo this sale?",
      message: "Zimmermann Z-121 goes back into stock and its sale details are removed.",
      actions: ["Undo sale", "Cancel"],
    });
  });
});

describe("the ⋯ menu", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["setImmediate", "nextTick", "queueMicrotask"] });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const openMenu = async (piano: PianoItem) => {
    const screen = await open(piano);
    await press(screen.renderer, "More options");
    return screen;
  };
  const menu = (renderer: ReactTestRenderer) => byTestId(renderer, "piano-actions-sheet");

  it("is closed until ⋯ is pressed", async () => {
    const { renderer } = await open(rented(10));

    expect(menu(renderer)).toHaveLength(0);
  });

  it("lists everything the page can do, the bar's action first and Delete last", async () => {
    const { renderer } = await openMenu(rented(10));
    const rows = (renderer.root.findAll(
      (node) => typeof node.props.onPress === "function" && (node.props.accessibilityLabel ?? "") !== "" && !isControl(node.props.accessibilityLabel)(node.parent)
    ) as any[]).map((node) => node.props.accessibilityLabel);

    // The page's own controls come first, then the sheet's rows (seven of them)
    expect(rows.slice(-7)).toEqual([
      "Record payment",
      "Remind customer",
      "Extend rental",
      "Mark as returned",
      "Edit piano",
      "Mark as sold",
      "Delete piano",
    ]);
  });

  it("runs the chosen action once the menu has closed, not under it", async () => {
    const { renderer } = await openMenu(onSale);
    const rowsOfSheet = renderer.root.findAll(
      (node) => isControl("Edit piano")(node) && !isControl("Edit piano")(node.parent)
    );
    const sheetRow = rowsOfSheet[rowsOfSheet.length - 1];

    await act(async () => sheetRow.props.onPress());
    expect(router.push).not.toHaveBeenCalled();

    await advance(300);
    expect(router.push).toHaveBeenCalledWith("/edit/piano-1");
  });

  it("asks before deleting, after the menu has closed", async () => {
    const { renderer } = await openMenu(events);
    const rowsOfSheet = renderer.root.findAll(
      (node) => isControl("Delete piano")(node) && !isControl("Delete piano")(node.parent)
    );

    await act(async () => rowsOfSheet[rowsOfSheet.length - 1].props.onPress());
    expect(alerts.titles()).toEqual([]);

    await advance(300);
    expect(dialogOf(renderer.root)?.title).toBe("Delete Steinway D?");
  });
});

describe("a piano that isn't there", () => {
  it("says Piano not found once the list has loaded without it, and goes back", async () => {
    const store = createTestStore({ user: testUser, items: [] });
    const renderer = renderWithStore(<DetailScreen />, store);

    expect(has(renderer, "Piano not found")).toBe(true);
    await press(renderer, "Go back");
    expect(router.back).toHaveBeenCalled();
  });

  describe("while the pianos are still loading", () => {
    const loading = (status: PianoLoadStatus) => {
      const store = createTestStore({ user: testUser, items: [] });
      // (Rendered without renderWithStore, so it brings its own safe area)
      const tree = (
        <SafeAreaProvider
          initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
        >
          <Provider store={store}>
            <PianoDataContext.Provider value={{ status, reportStatus: jest.fn(), refresher: { current: null } }}>
              <DetailScreen />
            </PianoDataContext.Provider>
          </Provider>
        </SafeAreaProvider>
      );
      return { store, tree };
    };
    const skeleton = (renderer: ReactTestRenderer) => byTestId(renderer, "detail-skeleton").length > 0;

    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("is blank for 200 ms, then shows the skeleton with a working Back button, never 'Piano not found'", async () => {
      const { tree } = loading("loading");
      const renderer = await mount(tree);

      expect(skeleton(renderer)).toBe(false);
      expect(has(renderer, "Piano not found")).toBe(false);

      await advance(200);
      expect(skeleton(renderer)).toBe(true);
      expect(has(renderer, "Piano not found")).toBe(false);

      await press(renderer, "Back to pianos");
      expect(router.back).toHaveBeenCalled();
    });

    it("shows the piano as soon as it arrives", async () => {
      const piano = rented(10);
      fakeBackend.documents.set(piano.$id, { ...piano });
      const { store, tree } = loading("loading");
      const renderer = await mount(tree);
      await advance(250);
      expect(skeleton(renderer)).toBe(true);

      await act(async () => {
        store.dispatch(setPianoListItems([piano]));
      });

      expect(skeleton(renderer)).toBe(false);
      expect(has(renderer, "Young Chang U-121")).toBe(true);
    });

    it("says Piano not found when the load has finished without it", async () => {
      const { tree } = loading("ready");
      const renderer = await mount(tree);

      expect(has(renderer, "Piano not found")).toBe(true);
    });
  });

  it("stays blank, not 'Piano not found', while it goes away after being deleted", async () => {
    const { renderer } = await open(warehouse);

    await press(renderer, "Delete piano");
    await pressDialog(renderer.root, "Delete");
    await flushPromises();

    expect(has(renderer, "Piano not found")).toBe(false);
    expect(router.back).toHaveBeenCalled();
  });
});
