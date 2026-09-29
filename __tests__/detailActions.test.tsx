jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn() })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));
jest.mock("@/services/notifications", () => ({
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import { Linking, Share } from "react-native";
import { act } from "react-test-renderer";
import CardItem from "@/components/CardItem";
import DetailScreen from "@/app/detail/[id]";
import icons from "@/constants/icons";
import { PianoItem } from "@/redux/pianos/types";
import { toInternationalDigits } from "@/utils/contact";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  findByImageSource,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

const rental = makePiano({
  $id: "piano-1",
  title: "Kawai K-300",
  make: "Kawai",
  category: "rentable",
  description: "Polished ebony upright",
  rental_customer_name: "Asha Mehta",
  rental_customer_mobile: "98765 43210",
  rental_customer_address: "12 MG Road",
  rental_period_start: "2026-09-01T00:00:00.000+00:00" as any,
  rental_period_end: "2026-12-01T00:00:00.000+00:00" as any,
  rental_price: 4000,
});

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  alerts = captureAlerts();
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const renderDetail = (piano: PianoItem = rental) =>
  renderWithStore(
    <DetailScreen />,
    createTestStore({ user: testUser, items: [piano] })
  );

const pressByLabel = async (renderer: any, label: string) => {
  const [node] = renderer.root.findAll(
    (candidate: any) =>
      candidate.props.accessibilityLabel === label &&
      typeof candidate.props.onPress === "function"
  );
  if (!node) throw new Error(`Nothing labelled "${label}"`);
  await act(async () => {
    await node.props.onPress();
  });
  await flushPromises();
};

describe("the customer's mobile number", () => {
  it("calls the customer when the number is tapped", async () => {
    const renderer = renderDetail();

    await pressByLabel(renderer, "Call 98765 43210");

    expect(Linking.openURL).toHaveBeenCalledWith("tel:9876543210");
  });

  it("opens a WhatsApp chat with the customer", async () => {
    const renderer = renderDetail();

    await pressByLabel(renderer, "Message on WhatsApp");

    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/919876543210");
  });

  it("keeps a number that already has a country code", () => {
    expect(toInternationalDigits("+44 7700 900123")).toBe("447700900123");
    expect(toInternationalDigits("+91-98765-43210")).toBe("919876543210");
  });

  it("says so when the phone can't open the link", async () => {
    jest.mocked(Linking.openURL).mockRejectedValue(new Error("No handler"));
    const renderer = renderDetail();

    await pressByLabel(renderer, "Message on WhatsApp");

    expect(alerts.titles()).toEqual(["Couldn't open WhatsApp"]);
  });

  it("no longer shows a search icon next to the number", () => {
    const renderer = renderDetail();

    expect(() =>
      findByImageSource(renderer.root, (source) => source === icons.search)
    ).toThrow();
  });
});

describe("sharing a piano", () => {
  it("opens the share sheet with the piano's details", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({} as any);
    const renderer = renderDetail();

    await pressByLabel(renderer, "Share");

    expect(alerts.titles()).toEqual([]);
    const [{ message, title }] = share.mock.calls[0] as any;
    expect(title).toBe("Kawai K-300");
    expect(message).toBe(
      "Kawai K-300\nKawai · Rentable\nPolished ebony upright"
    );
  });

  it("leaves out the customer's details", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({} as any);
    const renderer = renderDetail();

    await pressByLabel(renderer, "Share");

    const [{ message }] = share.mock.calls[0] as any;
    expect(message).not.toMatch(/Asha|98765|MG Road|4000/);
  });

  it("includes the asking price of a piano on sale", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({} as any);
    const renderer = renderDetail(
      makePiano({
        $id: "piano-1",
        title: "Yamaha C3",
        make: "Yamaha",
        category: "on_sale",
        description: "",
        on_sale_price: 1250000,
      })
    );

    await pressByLabel(renderer, "Share");

    const [{ message }] = share.mock.calls[0] as any;
    expect(message).toBe("Yamaha C3\nYamaha · On Sale\nPrice: ₹12,50,000");
  });
});

describe("bookmarks", () => {
  // Bookmarks lived only in the row's state and were lost on scroll, and
  // nothing ever listed them, so the button is gone
  const warehousePiano = makePiano();
  const hasBookmarkButton = (renderer: any) =>
    renderer.root.findAll(
      (node: any) =>
        typeof node.props.onPress === "function" &&
        node.findAll((child: any) => child.props.source === icons.bookmark)
          .length > 0
    ).length > 0;

  it.each([
    ["card", false],
    ["compact card", true],
  ])("aren't offered on a %s", (_name, isGridView) => {
    const renderer = renderWithStore(
      <CardItem
        item={warehousePiano}
        index={0}
        visibleMenuId={null}
        openMenu={jest.fn()}
        closeMenu={jest.fn()}
        isGridView={isGridView}
      />,
      createTestStore({ user: testUser, items: [warehousePiano] })
    );

    expect(hasBookmarkButton(renderer)).toBe(false);
    expect(allTexts(renderer.root)).not.toContain("Save");
  });
});
