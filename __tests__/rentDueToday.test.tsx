jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock("@/lib/appwrite", () => ({
  getRentPaymentsBetween: jest.fn(),
}));

import React from "react";
import { Linking } from "react-native";
import { act } from "react-test-renderer";
import { Provider } from "react-redux";
import { router } from "expo-router";
import Today from "@/app/(tabs)/today";
import { getRentPaymentsBetween } from "@/lib/appwrite";
import { PianoDataContext } from "@/lib/PianoDataContext";
import { paymentsChanged } from "@/redux/payments/actions";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { makePiano, testUser } from "./helpers/fixtures";
import { mount, textContent } from "./helpers/ui";
import { allTexts, createTestStore } from "./helpers/render";

/** The Rent due list on the Today tab. Today is 29 September 2026. */

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
  jest.clearAllMocks();
  jest.mocked(getRentPaymentsBetween).mockResolvedValue([]);
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const rental = (id: string, title: string, customer: string, extra = {}) =>
  makePiano({
    $id: id,
    title,
    category: "rentable",
    rental_customer_name: customer,
    rental_customer_mobile: "98765 43210",
    rental_period_start: "2026-08-01" as any,
    rental_period_end: "2026-12-01" as any,
    rental_price: 4000,
    ...extra,
  });

const kawai = rental("kawai", "Kawai K-300", "Asha Mehta");
// Began on 1 June: four months have fallen due, one is paid
const weber = rental("weber", "Weber W-121", "Karan Malhotra", {
  rental_period_start: "2026-06-01",
  rental_price: 6000,
});
const yamaha = rental("yamaha", "Yamaha C3", "Ravi Kumar", {
  rental_customer_mobile: "",
  rental_period_start: "2026-09-01",
  rental_price: 2000,
});
const petrof = rental("petrof", "Petrof P118", "Sana Qureshi");
const warehouse = makePiano({ $id: "store", title: "Ronish R-112", category: "warehouse" });

const payment = (id: string, pianoId: string, paidOn: string, amount: number, customer: string) => ({
  $id: id,
  $createdAt: `${paidOn}T09:00:00.000+00:00`,
  piano_id: pianoId,
  creator: testUser.accountId,
  amount,
  paid_on: paidOn,
  customer_name: customer,
});
const payments = [
  payment("p-weber", "weber", "2026-06-02", 6000, "Karan Malhotra"),
  payment("p-petrof-aug", "petrof", "2026-08-02", 4000, "Sana Qureshi"),
  payment("p-petrof-sep", "petrof", "2026-09-03", 4000, "Sana Qureshi"),
];

const open = async ({
  items = [kawai, weber, yamaha, petrof, warehouse],
  paid = payments,
}: { items?: any[]; paid?: any[] } = {}) => {
  jest.mocked(getRentPaymentsBetween).mockResolvedValue(paid);
  const store = createTestStore({ user: testUser, items });
  const renderer = await mount(
    <Provider store={store}>
      <PianoDataContext.Provider
        value={{ status: "ready", reportStatus: jest.fn(), refresher: { current: null } }}
      >
        <Today />
      </PianoDataContext.Provider>
    </Provider>
  );
  return { store, renderer };
};

const has = (renderer: any, text: string) => allTexts(renderer.root).includes(text);
const pressable = (renderer: any, label: string) =>
  renderer.root.findAll(
    (node: any) => node.props.accessibilityLabel === label && typeof node.props.onPress === "function"
  )[0];
const press = async (renderer: any, label: string) => {
  const target = pressable(renderer, label);
  if (!target) throw new Error(`No "${label}" button`);
  await act(async () => {
    await target.props.onPress();
  });
};
/** The rows' labels, in the order they are drawn: what each says about the rent. */
const dueRows = (renderer: any) =>
  renderer.root
    .findAll(
      (node: any) =>
        typeof node.type === "string" &&
        node.props.accessibilityHint === "Opens this piano" &&
        / due · /.test(node.props.accessibilityLabel ?? "")
    )
    .map((node: any) => node.props.accessibilityLabel as string);
const headings = (renderer: any) =>
  renderer.root
    .findAll((node: any) => typeof node.type === "string" && node.props.accessibilityRole === "header")
    .map(textContent);
const sentText = () => {
  const [url] = jest.mocked(Linking.openURL).mock.calls[0] as [string];
  const [, number, text] = url.match(/^https:\/\/wa\.me\/(\d+)\?text=(.*)$/) ?? [];
  return { number, text: decodeURIComponent(text ?? "") };
};

describe("the Rent due list", () => {
  it("lists the rentals that owe rent, the most owed first, each with what it owes", async () => {
    const { renderer } = await open();

    expect(dueRows(renderer)).toEqual([
      "Weber W-121, Karan Malhotra, ₹18,000 due · 3 months, since 1 Jul",
      "Kawai K-300, Asha Mehta, ₹4,000 due · 1 month, since 1 Sep",
      "Yamaha C3, Ravi Kumar, ₹2,000 due · 1 month, since 1 Sep",
    ]);
  });

  it("says it short on the row, so it fits beside the button, and whole to a screen reader", async () => {
    const { renderer } = await open();

    expect(has(renderer, "₹18,000 due · 3 months")).toBe(true);
    expect(has(renderer, "₹4,000 due · 1 month")).toBe(true);
    expect(has(renderer, "₹18,000 due · 3 months, since 1 Jul")).toBe(false);
    expect(
      pressable(renderer, "Weber W-121, Karan Malhotra, ₹18,000 due · 3 months, since 1 Jul")
    ).toBeDefined();
  });

  it("comes after Needs attention and before Rented out", async () => {
    const { renderer } = await open();

    expect(headings(renderer)).toEqual([
      "Needs attention",
      "Rent due",
      "Rented out",
      "Recent payments",
      "Income",
    ]);
  });

  it("is left out when every rental is paid up", async () => {
    const { renderer } = await open({ items: [petrof, warehouse] });

    expect(headings(renderer)).not.toContain("Rent due");
    expect(dueRows(renderer)).toEqual([]);
  });

  it("is left out when there are no rentals", async () => {
    const { renderer } = await open({ items: [warehouse] });

    expect(headings(renderer)).not.toContain("Rent due");
  });

  it("doesn't say anything is due before the payments have loaded", async () => {
    // Today's own request answers, the income section's never does
    jest.mocked(getRentPaymentsBetween).mockReset();
    jest
      .mocked(getRentPaymentsBetween)
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(new Promise(() => {}));
    const store = createTestStore({ user: testUser, items: [kawai] });
    const renderer = await mount(
      <Provider store={store}>
        <PianoDataContext.Provider
          value={{ status: "ready", reportStatus: jest.fn(), refresher: { current: null } }}
        >
          <Today />
        </PianoDataContext.Provider>
      </Provider>
    );

    expect(has(renderer, "Today")).toBe(true);
    expect(headings(renderer)).not.toContain("Rent due");
  });

  it("doesn't say anything is due when the payments couldn't be loaded", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.mocked(getRentPaymentsBetween).mockReset();
    jest
      .mocked(getRentPaymentsBetween)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("offline"));
    const store = createTestStore({ user: testUser, items: [kawai] });
    const renderer = await mount(
      <Provider store={store}>
        <PianoDataContext.Provider
          value={{ status: "ready", reportStatus: jest.fn(), refresher: { current: null } }}
        >
          <Today />
        </PianoDataContext.Provider>
      </Provider>
    );

    expect(headings(renderer)).not.toContain("Rent due");
  });

  it("opens the piano from its row", async () => {
    const { renderer } = await open();

    await press(renderer, "Kawai K-300, Asha Mehta, ₹4,000 due · 1 month, since 1 Sep");

    expect(router.push).toHaveBeenCalledWith("/detail/kawai");
  });

  it("goes away once the rent is paid", async () => {
    const { store, renderer } = await open({ items: [kawai] });
    expect(dueRows(renderer)).toHaveLength(1);

    jest
      .mocked(getRentPaymentsBetween)
      .mockResolvedValue([payment("p-new", "kawai", "2026-09-29", 4000, "Asha Mehta")]);
    await act(async () => {
      store.dispatch(paymentsChanged());
    });

    expect(dueRows(renderer)).toEqual([]);
    expect(headings(renderer)).not.toContain("Rent due");
  });
});

describe("reminding from the Rent due list", () => {
  it("opens the renter's WhatsApp chat with how much is due typed in", async () => {
    const { renderer } = await open();

    await press(renderer, "Remind Asha Mehta on WhatsApp");

    const { number, text } = sentText();
    expect(number).toBe("919876543210");
    expect(text).toContain("Hello Asha Mehta,");
    expect(text).toContain("₹4,000 of the rent is due (1 month, since 1 Sep 2026).");
    expect(text).toContain("Please arrange the payment.");
  });

  it("says how many months when more are due", async () => {
    const { renderer } = await open();

    await press(renderer, "Remind Karan Malhotra on WhatsApp");

    expect(sentText().text).toContain("₹18,000 of the rent is due (3 months, since 1 Jul 2026).");
  });

  it("has no button for a rental with no number to message", async () => {
    const { renderer } = await open();

    expect(pressable(renderer, "Remind Ravi Kumar on WhatsApp")).toBeUndefined();
    // Its row still opens the piano
    expect(pressable(renderer, "Yamaha C3, Ravi Kumar, ₹2,000 due · 1 month, since 1 Sep")).toBeDefined();
  });

  it("names the piano on the button when the rental has no customer name", async () => {
    const { renderer } = await open({ items: [rental("anon", "Steinway B", "")] });

    expect(pressable(renderer, "Remind Steinway B on WhatsApp")).toBeDefined();
  });
});

describe("the Rent due rows for screen readers and thumbs", () => {
  it("have names and roles, and a button at least 44 px across", async () => {
    const { renderer } = await open();
    const problems = describeProblems(a11yProblems(renderer.root)).filter((line) =>
      /due|Remind/.test(line)
    );

    expect(problems).toEqual([]);
  });
});
