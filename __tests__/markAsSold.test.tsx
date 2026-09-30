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
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  }),
}));
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return (props: any) => React.createElement("DateTimePicker", props);
});

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import { addDays } from "date-fns";
import Home from "@/app/(tabs)/home";
import Profile from "@/app/(tabs)/profile";
import DetailScreen from "@/app/detail/[id]";
import {
  scheduleAllRentalNotifications,
  scheduleRentalDueNotification,
} from "@/services/notifications";
import * as appwrite from "@/lib/appwrite";
import { setPianoFilters } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import { countActiveFilters } from "@/utils/filters";
import { toStoredDate } from "@/utils/dates";
import { getStatusLabel } from "@/utils/pianoStatus";
import { fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  captureToasts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

const inDays = (days: number) => toStoredDate(addDays(new Date(), days));

const rental = makePiano({
  $id: "piano-1",
  title: "Kawai K-300",
  category: "rentable",
  rental_customer_name: "Asha Mehta",
  rental_customer_mobile: "9876543210",
  rental_period_start: inDays(-30) as any,
  rental_period_end: inDays(30) as any,
  rental_price: 4000,
});

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  alerts = captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const field = (renderer: ReactTestRenderer, title: string) => {
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.title === title &&
      typeof candidate.props.handleChangeText === "function"
  );
  if (!node) throw new Error(`No field titled "${title}"`);
  return node;
};

const typeInto = (renderer: ReactTestRenderer, title: string, text: string) =>
  act(() => {
    field(renderer, title).props.handleChangeText(text);
  });

const pressButton = async (renderer: ReactTestRenderer, title: string) => {
  const [button] = renderer.root.findAll(
    (node) =>
      node.props.title === title && typeof node.props.handlePress === "function"
  );
  if (!button) throw new Error(`No "${title}" button`);
  await act(async () => {
    await button.props.handlePress();
  });
  await flushPromises();
};

const openDetail = async (piano: PianoItem = rental) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await scheduleRentalDueNotification(piano);
  return { store, renderer };
};

// The row on the piano's page (or the bar, for a piano on sale) that opens the sheet
const openSoldSheet = async (renderer: ReactTestRenderer) => {
  const [button] = renderer.root.findAll(
    (node) =>
      node.props.accessibilityLabel === "Mark as sold" &&
      typeof node.props.onPress === "function"
  );
  if (!button) throw new Error("No Mark as sold on the page");
  await act(async () => button.props.onPress());
};

describe("marking a piano as sold", () => {
  it("records the buyer, price and date, and keeps the photo", async () => {
    const toasts = captureToasts();
    const { store, renderer } = await openDetail();

    await openSoldSheet(renderer);
    typeInto(renderer, "Buyer Name", "  Ravi Kumar ");
    typeInto(renderer, "Buyer Address", "5 Park Street");
    typeInto(renderer, "Sale Price", "185000");
    await pressButton(renderer, "Mark as Sold");

    expect(alerts.titles()).toEqual([]);
    const saved = fakeBackend.documents.get("piano-1");
    expect(saved).toMatchObject({
      sold_to_name: "Ravi Kumar",
      sold_to_address: "5 Park Street",
      sold_price: 185000,
      sold_date: toStoredDate(new Date()),
      // Only the sale fields change
      image_url: fileViewUrl("old-file"),
      title: "Kawai K-300",
    });
    expect(store.getState().pianos.items[0].sold_to_name).toBe("Ravi Kumar");
    expect(toasts).toEqual(["Marked Kawai K-300 as sold"]);

    const texts = allTexts(renderer.root);
    expect(texts).toContain("SOLD");
    expect(texts).toContain("Ravi Kumar");
    expect(texts).toContain("₹1,85,000");
    expect(texts).toContain("Undo sale");
  });

  it("saves the price as a number, the way the database stores it", async () => {
    const { renderer } = await openDetail();

    await openSoldSheet(renderer);
    typeInto(renderer, "Buyer Name", "Ravi Kumar");
    typeInto(renderer, "Sale Price", "185000");
    await pressButton(renderer, "Mark as Sold");

    expect(alerts.titles()).toEqual([]);
    expect(fakeBackend.documents.get("piano-1")?.sold_price).toBe(185000);
  });

  it("stops the rental reminders of a sold piano", async () => {
    const { renderer } = await openDetail();
    expect(fakeNotifications.rentalReminders("piano-1").length).toBeGreaterThan(
      0
    );

    await openSoldSheet(renderer);
    typeInto(renderer, "Buyer Name", "Ravi Kumar");
    typeInto(renderer, "Sale Price", "185000");
    await pressButton(renderer, "Mark as Sold");

    expect(fakeNotifications.rentalReminders("piano-1")).toEqual([]);
  });

  it("needs the buyer's name and a price", async () => {
    const { renderer } = await openDetail();
    await openSoldSheet(renderer);

    await pressButton(renderer, "Mark as Sold");
    typeInto(renderer, "Buyer Name", "Ravi Kumar");
    await pressButton(renderer, "Mark as Sold");

    expect(alerts.titles()).toEqual(["Missing Details", "Missing Details"]);
    expect(alerts.spy.mock.calls.map((call) => call[1])).toEqual([
      "Please enter the buyer's name.",
      "Please enter the sale price.",
    ]);
    expect(fakeBackend.documents.get("piano-1")?.sold_date).toBeUndefined();
  });

  it("suggests the asking price of a piano on sale", async () => {
    const { renderer } = await openDetail(
      makePiano({ $id: "piano-1", category: "on_sale", on_sale_price: 250000 })
    );

    await openSoldSheet(renderer);

    expect(field(renderer, "Sale Price").props.value).toBe("250000");
  });

  it("no longer counts down the rental on the piano's page, or shows who had it (the Sold board)", async () => {
    const sold = {
      ...rental,
      sold_date: inDays(-2),
      sold_price: 185000,
      sold_to_name: "Ravi Kumar",
    } as any;
    const { renderer } = await openDetail(sold);

    const texts = allTexts(renderer.root).join(" ");
    expect(texts).not.toMatch(/Rental ends|Rental ended|days left|Rent overdue/);
    expect(texts).not.toContain("Rental");
    expect(texts).not.toContain("Asha Mehta");
    // It says it was sold, and to whom
    expect(texts).toContain("Sold on");
    expect(texts).toContain("Ravi Kumar");
  });

  it("can be undone", async () => {
    const sold = {
      ...rental,
      sold_date: inDays(-2),
      sold_price: 185000,
      sold_to_name: "Ravi Kumar",
    } as any;
    const { store, renderer } = await openDetail(sold);

    const [undo] = renderer.root.findAll(
      (node) =>
        node.props.accessibilityLabel === "Undo sale" &&
        typeof node.props.onPress === "function"
    );
    await act(async () => undo.props.onPress());
    await alerts.pressButton("Undo Sale");

    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      sold_date: null,
      sold_price: null,
      sold_to_name: null,
    });
    expect(store.getState().pianos.items[0].sold_date).toBeNull();
    // Still rented, so its reminders come back
    expect(fakeNotifications.rentalReminders("piano-1").length).toBeGreaterThan(
      0
    );
  });
});

describe("sold pianos elsewhere", () => {
  const inStock = makePiano({ $id: "in-stock", title: "Yamaha U1" });
  const soldRental = {
    ...rental,
    $id: "sold",
    title: "Sold Kawai",
    sold_date: inDays(-1),
  } as any;

  it("are left out of the Home list unless the Sold filter is on", async () => {
    jest
      .spyOn(appwrite, "getUserPianoEntries")
      .mockResolvedValue([inStock, soldRental] as any);
    const store = createTestStore({ user: testUser });
    renderWithStore(<Home />, store);
    await flushPromises();

    const listed = () =>
      store.getState().pianos.filteredItems.map((piano) => piano.$id);
    expect(listed()).toEqual(["in-stock"]);

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, isSold: true }));
    });
    await flushPromises();
    expect(listed()).toEqual(["sold"]);
  });

  it("count as a filter on the filter button", () => {
    // The count on the round filter button is the number of filters in use
    expect(countActiveFilters({ ...DEFAULT_FILTERS, isSold: true })).toBe(1);
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
  });

  it("get no rental reminders", async () => {
    await scheduleAllRentalNotifications([rental, soldRental]);

    expect(fakeNotifications.rentalReminders("sold")).toEqual([]);
    expect(fakeNotifications.rentalReminders("piano-1").length).toBeGreaterThan(
      0
    );
  });

  it("aren't counted as stock or as rented on the profile", () => {
    const renderer = renderWithStore(
      <Profile />,
      createTestStore({ user: testUser, items: [inStock, rental, soldRental] })
    );

    const texts = allTexts(renderer.root);
    expect(texts[texts.indexOf("In Stock") - 1]).toBe("2");
    expect(texts[texts.indexOf("Currently Rented") - 1]).toBe("1");
  });

  it("are labelled as sold in the list", () => {
    expect(getStatusLabel(soldRental)).toBe("Rentable · Sold");
    expect(getStatusLabel(inStock)).toBe("Warehouse");
  });
});
