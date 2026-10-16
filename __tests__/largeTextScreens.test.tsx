jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock("@/lib/appwrite", () => ({
  getRentPaymentsBetween: jest.fn(),
}));

import { addDays } from "date-fns";
import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import Today from "@/app/(tabs)/today";
import CustomerRow from "@/components/CustomerRow";
import { InfoRows } from "@/components/DetailParts";
import { LetterheadThumbnail } from "@/components/FormThumbnail";
import IncomeChart from "@/components/IncomeChart";
import MakePickerSheet, { indexFits } from "@/components/MakePickerSheet";
import PianoCard from "@/components/PianoCard";
import PianoRow from "@/components/PianoRow";
import WelcomeScreen from "@/components/WelcomeScreen";
import { maxScale } from "@/constants/theme";
import { getRentPaymentsBetween } from "@/lib/appwrite";
import { PianoDataContext } from "@/lib/PianoDataContext";
import type { Customer } from "@/utils/customers";
import { toStoredDate } from "@/utils/dates";
import { getPianoDisplay } from "@/utils/pianoDisplay";
import { DEFAULT_DESIGN } from "@/utils/letterhead";
import { makePiano, testUser } from "./helpers/fixtures";
import { mount, textContent } from "./helpers/ui";
import { atFontScale, createTestStore } from "./helpers/render";

/**
 * The screens with a big Font size (docs/large-text/PLAN.md, Batch L4): counts
 * become a list, rows and cards give their words two lines and move the
 * price, the details stack, and the pickers, chart and Welcome fit. At 100%
 * each is as drawn.
 */

type Mounted = Awaited<ReturnType<typeof mount>>;
const flat = (style: unknown) => StyleSheet.flatten(style as any);
const texts = (renderer: Mounted) => renderer.root.findAllByType(Text);
const textNode = (renderer: Mounted, content: string) => texts(renderer).find((text) => textContent(text) === content)!;
/** The innermost view that holds all of these texts, and so shows what sits together */
const holding = (renderer: Mounted, ...words: string[]) =>
  renderer.root
    .findAll(
      (node) =>
        (node.type as unknown) === "View" &&
        words.every((word) => node.findAllByType(Text).some((text) => textContent(text) === word))
    )
    .pop()!;
const hasText = (renderer: Mounted, content: string) => texts(renderer).some((text) => textContent(text) === content);
const withInsets = (children: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    }}
  >
    {children}
  </SafeAreaProvider>
);

const rented = makePiano({
  $id: "rented",
  title: "Young Chang U-121 Upright",
  category: "rentable",
  company_associated: "The Piano Services",
  rental_customer_name: "Meera Kapoor",
  rental_period_start: toStoredDate(addDays(new Date(), -40)) as any,
  rental_period_end: toStoredDate(addDays(new Date(), 20)) as any,
  rental_price: 4500,
});

describe("Today's counts", () => {
  const open = async () => {
    jest.mocked(getRentPaymentsBetween).mockResolvedValue([]);
    const store = createTestStore({ user: testUser, items: [rented] });
    return mount(
      <Provider store={store}>
        <PianoDataContext.Provider value={{ status: "ready", reportStatus: jest.fn(), refresher: { current: null } }}>
          <Today />
        </PianoDataContext.Provider>
      </Provider>
    );
  };
  const countsOf = (renderer: Mounted) =>
    renderer.root.find((node) => (node.type as unknown) === "View" && flat(node.props.style ?? {}).borderTopWidth === 1 && flat(node.props.style ?? {}).paddingTop === 16);
  const cell = (renderer: Mounted, label: string) =>
    renderer.root.find((node) => (node.type as unknown) === "View" && node.props.accessibilityLabel?.startsWith(`${label},`));

  it("are three columns at 100%: In stock, On rent and Sold this month", async () => {
    const renderer = await open();

    expect(flat(countsOf(renderer).props.style).flexDirection).toBe("row");
    expect(flat(cell(renderer, "In stock").props.style).flex).toBe(1);
    expect(flat(cell(renderer, "Sold this month").props.style).flex).toBe(1.3);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("are a list, one line each with the number at the right, so the sold amount is never cut", async () => {
      const renderer = await open();

      expect(flat(countsOf(renderer).props.style).flexDirection).toBe("column");
      for (const label of ["In stock", "On rent", "Sold this month"]) {
        expect(flat(cell(renderer, label).props.style)).toMatchObject({
          flex: 0,
          flexDirection: "row-reverse",
          justifyContent: "space-between",
        });
      }
    });
  });
});

describe("a piano card in the grid", () => {
  const display = getPianoDisplay(rented);
  const open = () => mount(<PianoCard item={rented} onOpen={() => {}} />);

  it("has a title on one line, and the price and status together on the last line at 100%", async () => {
    const renderer = await open();

    expect(textNode(renderer, "Young Chang U-121 Upright").props.numberOfLines).toBe(1);
    const last = texts(renderer).find((text) => textContent(text) === `${display.price}${display.cardRest}`)!;
    expect(last.props.numberOfLines).toBe(1);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("lets the title and the company take two lines", async () => {
      const renderer = await open();

      expect(textNode(renderer, "Young Chang U-121 Upright").props.numberOfLines).toBe(2);
      expect(textNode(renderer, "The Piano Services").props.numberOfLines).toBe(2);
    });

    it("gives the price and the status a line each, so neither is cut for the other", async () => {
      const renderer = await open();
      const price = textNode(renderer, display.price!);
      const status = textNode(renderer, display.cardRest.replace(/^ · /, ""));

      expect(price.props.numberOfLines).toBe(2);
      expect(flat(price.props.style)).toMatchObject({ fontFamily: flat(renderer.root.findAllByType(Text).find((t) => textContent(t) === display.price)!.props.style).fontFamily });
      expect(status.props.numberOfLines).toBe(2);
      expect(hasText(renderer, `${display.price}${display.cardRest}`)).toBe(false);
    });
  });
});

describe("a piano row in the list", () => {
  const display = getPianoDisplay(rented);
  const open = () => mount(<PianoRow item={rented} onOpen={() => {}} />);

  it("has the price at the right of the words at 100%, every line on one line", async () => {
    const renderer = await open();

    expect(textNode(renderer, "Young Chang U-121 Upright").props.numberOfLines).toBe(1);
    // The price is beside the words' column, in the row that holds both
    const row = holding(renderer, display.price!, display.status.text);
    expect(flat(row.props.style)).toMatchObject({ flexDirection: "row" });
    expect(flat(holding(renderer, display.status.text).props.style).flex).toBe(1);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("puts the price under the status, so the words get the whole row", async () => {
      const renderer = await open();
      const status = textNode(renderer, display.status.text);

      // The price and the status are in the same column of words, the one that takes the row's width
      const column = holding(renderer, display.price!, display.status.text);
      expect(flat(column.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
      expect(textNode(renderer, "Young Chang U-121 Upright").props.numberOfLines).toBe(2);
      expect(status.props.numberOfLines).toBe(2);
    });
  });
});

describe("a customer in the list", () => {
  const customer: Customer = {
    key: "meera-kapoor",
    name: "Meera Kapoor",
    pianos: [],
    paymentsCount: 3,
    total: 13500,
    lastPaidOn: null,
    mobile: null,
    renting: true,
    rentals: [],
  };
  const open = () => mount(<CustomerRow customer={customer} onOpen={() => {}} />);

  it("has what they paid at the right of the name at 100%", async () => {
    const renderer = await open();

    expect(flat(textNode(renderer, "₹13,500").parent!.props.style).alignItems).toBe("flex-end");
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("puts what they paid under the name, which may take two lines", async () => {
      const renderer = await open();

      expect(flat(textNode(renderer, "₹13,500").parent!.props.style).alignItems).toBe("flex-start");
      expect(textNode(renderer, "Meera Kapoor").props.numberOfLines).toBe(2);
      // It is inside the column of words, not beside it
      expect(flat(holding(renderer, "Meera Kapoor", "₹13,500").props.style)).toMatchObject({ flex: 1, minWidth: 0 });
    });
  });
});

describe("the details on a piano's page", () => {
  const rows = [
    { label: "Purchased", value: "21 Dec 2025" },
    { label: "Customer address", value: "Flat 402, Shanti Apartments, Sector 21, Gurugram", strong: false },
  ];
  const open = () => mount(<InfoRows rows={rows} />);
  const rowOf = (renderer: Mounted, label: string) => flat(textNode(renderer, label).parent!.props.style);

  it("has each label at the left of its value at 100%", async () => {
    const renderer = await open();

    expect(rowOf(renderer, "Purchased")).toMatchObject({ flexDirection: "row", justifyContent: "space-between", minHeight: 52 });
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("puts each label above its value, so a long value has the whole width", async () => {
      const renderer = await open();
      const row = rowOf(renderer, "Customer address");

      expect(row).toMatchObject({ flexDirection: "column", alignItems: "flex-start", minHeight: 52 });
      expect(flat(textNode(renderer, rows[1].value).props.style)).toMatchObject({ textAlign: "left" });
    });
  });
});

describe("the make picker's A to Z index", () => {
  it("is shown whenever it fits beside the list, or the list is not measured yet", () => {
    expect(indexFits(26, 1, 0)).toBe(true);
    // 8 + 26 letters of 13 + 3 = 424
    expect(indexFits(26, 1, 424)).toBe(true);
    expect(indexFits(26, 1, 423)).toBe(false);
  });

  it("grows with the Font size only up to its limit of 120%", () => {
    // 8 + 26 * (13 * 1.2 + 3) = 8 + 26 * 18.6 = 491.6
    expect(indexFits(26, 1.2, 492)).toBe(true);
    expect(indexFits(26, 2, 492)).toBe(true);
    expect(indexFits(26, 2, 491)).toBe(false);
  });

  it("is left out when a short screen can't hold all the letters", () => {
    expect(indexFits(26, 1.5, 300)).toBe(false);
    expect(indexFits(5, 1.5, 300)).toBe(true);
  });

  it("limits how big its letters and the headings grow", async () => {
    const makes = ["Kawai", "Yamaha", "Steinway", "Bechstein", "Roland"];
    const renderer = await mount(
      withInsets(<MakePickerSheet visible makes={makes} value="" onSelect={() => {}} onClose={() => {}} />)
    );

    // "K" is twice on the screen: as the heading of its section, then as a letter of the index at the right
    const [heading, letter] = texts(renderer).filter((text) => textContent(text) === "K");
    expect(heading.props.accessibilityRole).toBe("header");
    expect(heading.props.maxFontSizeMultiplier).toBe(maxScale.section);
    expect(letter.props.maxFontSizeMultiplier).toBe(maxScale.count);
    // A make is one line, so its row can stay the fixed height the jump to a letter relies on
    expect(textNode(renderer, "Yamaha").props.numberOfLines).toBe(1);
  });
});

describe("the income chart", () => {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2026, i, 1),
    rent: 4000 * (i + 1),
    salesCount: 0,
    salesTotal: 0,
  })) as any;

  it("has bars at most 28 wide that never need more than their column", async () => {
    const renderer = await mount(<IncomeChart months={months} narrow />);
    const wells = renderer.root.findAll((node) => (node.type as unknown) === "View" && flat(node.props.style ?? {}).maxWidth === 28);

    expect(wells).toHaveLength(12);
    expect(flat(wells[0].props.style)).toMatchObject({ width: "100%", maxWidth: 28 });
    const columns = renderer.root.findAll((node) => (node.type as unknown) === "View" && flat(node.props.style ?? {}).minWidth === 0 && flat(node.props.style ?? {}).flex === 1);
    expect(columns.length).toBeGreaterThanOrEqual(12);
  });
});

describe("the Welcome screen", () => {
  const open = () => mount(withInsets(<WelcomeScreen />));
  const hero = (renderer: Mounted) =>
    renderer.root.find((node) => (node.type as unknown) === "View" && flat(node.props.style ?? {}).borderBottomLeftRadius === 32);

  it("scrolls, and keeps the board's orange top at 100%", async () => {
    const renderer = await open();

    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(1);
    expect(flat(renderer.root.findByType(ScrollView).props.contentContainerStyle).flexGrow).toBe(1);
    expect(flat(hero(renderer).props.style).height).toBe(468 + 47 > 1334 * 0.52 ? 1334 * 0.52 : 468 + 47);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("gives room back from the orange top to the words and buttons", async () => {
      const renderer = await open();

      expect(flat(hero(renderer).props.style).height).toBeCloseTo(1334 * 0.3);
      expect(hasText(renderer, "Sign in")).toBe(true);
      expect(hasText(renderer, "Create account")).toBe(true);
    });
  });
});

describe("the letterhead drawings", () => {
  it("keep their letters at the size of the picture, whatever the Font size", async () => {
    const renderer = await mount(
      <LetterheadThumbnail design={{ ...DEFAULT_DESIGN, style: "make", template: "monogram" }} initials="TP" />
    );

    expect(textNode(renderer, "TP").props.allowFontScaling).toBe(false);
  });
});
