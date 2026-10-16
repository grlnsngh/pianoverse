jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));
jest.mock("@/lib/appwrite", () => ({
  getRentalHistory: jest.fn(),
}));

import React from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import AvailabilityScreen from "@/app/availability";
import { getRentalHistory } from "@/lib/appwrite";
import { PianoLoadStatus, PianoDataContext } from "@/lib/PianoDataContext";
import { makePiano, testUser } from "./helpers/fixtures";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import {
  allTexts,
  atFontScale,
  createTestStore,
  findButton,
  flushPromises,
  pressButton,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

/** The Availability screen (canvas page "Availability"). Today is Tuesday 29 September 2026. */

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  jest.mocked(getRentalHistory).mockResolvedValue([]);
});
afterEach(() => {
  jest.useRealTimers();
});

const rented = (id: string, title: string, who: string, start: string, end: string | null, extra = {}) =>
  makePiano({
    $id: id,
    title,
    category: "rentable",
    company_associated: "Kirpalsons",
    rental_customer_name: who,
    rental_period_start: start as any,
    rental_period_end: end as any,
    ...extra,
  } as any);

const idle = (id: string, title: string, extra = {}) =>
  makePiano({ $id: id, title, category: "rentable", company_associated: "Kirpalsons", ...extra } as any);

const weber = rented("weber", "Weber W-121", "Karan Malhotra", "2026-08-01", "2026-10-20");
const kawai = rented("kawai", "Kawai K-300", "Asha Mehta", "2026-07-01", "2026-12-12");
const youngChang = rented("yc", "Young Chang U-121", "Meera Kapoor", "2026-06-01", "2026-09-22");
const samick = idle("samick", "Samick SU-118");
const petrof = idle("petrof", "Petrof P118");
const schimmel = rented("schimmel", "Schimmel W114", "Shamsher Singh", "2026-12-02", "2027-02-01");
const steinway = idle("steinway", "Steinway B", { category: "events", company_associated: "Shamshersons" });

const stock = [weber, kawai, youngChang, samick, petrof, schimmel, steinway];

const keptRental = (extra: Record<string, unknown> = {}) =>
  ({
    $id: "kept-1",
    $createdAt: "2026-09-12T00:00:00.000+00:00",
    piano_id: "samick",
    creator: testUser.accountId,
    customer_name: "Ravi Kumar",
    period_start: "2026-08-01",
    period_end: "2026-09-10",
    price: 3500,
    closed_on: "2026-09-10",
    reason: "ended",
    ...extra,
  }) as any;

const open = async (items = stock, status: PianoLoadStatus = "ready") => {
  const store = createTestStore({ user: testUser, items });
  const refresher = { current: null };
  const renderer = renderWithStore(
    <PianoDataContext.Provider value={{ status, reportStatus: () => {}, refresher }}>
      <AvailabilityScreen />
    </PianoDataContext.Provider>,
    store
  );
  await flushPromises();
  return renderer;
};

type Rendered = Awaited<ReturnType<typeof open>>;
const texts = (renderer: Rendered) => allTexts(renderer.root);
const has = (renderer: Rendered, text: string) => texts(renderer).includes(text);
const rows = (renderer: Rendered) =>
  renderer.root
    .findAll((node) => node.props.accessibilityHint === "Opens this piano" && typeof node.props.onPress === "function")
    .map((node) => node.props.accessibilityLabel as string);

describe("On a day", () => {
  it("opens on today, with this month's calendar and the rentable pianos", async () => {
    const renderer = await open();

    expect(has(renderer, "Availability")).toBe(true);
    expect(has(renderer, "September 2026")).toBe(true);
    expect(has(renderer, "Tuesday 29 September")).toBe(true);
    expect(has(renderer, "3 free · 3 out")).toBe(true);
    expect(has(renderer, "Free · 3")).toBe(true);
    expect(has(renderer, "Out · 3")).toBe(true);
    expect(has(renderer, "A rental ends that day")).toBe(true);
  });

  it("lists the free pianos A to Z and the out ones, with a line each", async () => {
    const renderer = await open();

    expect(rows(renderer)).toEqual([
      "Petrof P118, Rentable · Kirpalsons",
      "Samick SU-118, Rentable · Kirpalsons",
      "Schimmel W114, Rentable · Kirpalsons, Free until 1 Dec",
      "Young Chang U-121, Meera Kapoor, Ended 22 Sep, not back",
      "Weber W-121, Karan Malhotra, Until 20 Oct",
      "Kawai K-300, Asha Mehta, Until 12 Dec",
    ]);
  });

  it("opens a piano when its row is pressed", async () => {
    const renderer = await open();

    await pressLabel(renderer.root, "Samick SU-118, Rentable · Kirpalsons");
    expect(router.push).toHaveBeenCalledWith("/detail/samick");
  });

  it("changes the lists when another day is pressed", async () => {
    const renderer = await open();

    // 21 October: Weber has come back
    await pressLabel(renderer.root, "Next month");
    expect(has(renderer, "October 2026")).toBe(true);
    await pressLabel(renderer.root, "Wednesday 21 October");

    expect(has(renderer, "Wednesday 21 October")).toBe(true);
    expect(has(renderer, "4 free · 2 out")).toBe(true);
    expect(rows(renderer)).toContain("Weber W-121, Rentable · Kirpalsons, Free from 21 Oct");
    expect(rows(renderer).some((row) => row.startsWith("Weber W-121, Karan"))).toBe(false);
  });

  it("marks the days a rental ends, and says so to a screen reader", async () => {
    const renderer = await open();

    await pressLabel(renderer.root, "Next month");
    // Weber ends on the 20th of October
    const dots = () =>
      renderer.root.findAll((node) => typeof node.type === "string" && node.props.testID === "ends-dot");
    expect(dots()).toHaveLength(1);
    await pressLabel(renderer.root, "Tuesday 20 October, a rental ends");
    expect(has(renderer, "Tuesday 20 October")).toBe(true);
    // The day that is chosen shows no dot
    expect(dots()).toHaveLength(0);
  });

  it("goes back a month and shows what the kept rentals say about a day then", async () => {
    jest.mocked(getRentalHistory).mockResolvedValue([keptRental()]);
    const renderer = await open();

    await pressLabel(renderer.root, "Previous month");
    expect(has(renderer, "August 2026")).toBe(true);
    await pressLabel(renderer.root, "Wednesday 12 August");

    expect(rows(renderer)).toContain("Samick SU-118, Ravi Kumar, Until 10 Sep");
  });

  it("asks for the kept rentals of the signed-in owner", async () => {
    await open();
    expect(getRentalHistory).toHaveBeenCalledWith(testUser.accountId);
  });

  it("changes to another kind of piano", async () => {
    const renderer = await open();

    await pressLabel(renderer.root, "Events");
    expect(rows(renderer)).toEqual(["Steinway B, Events · Shamshersons"]);
    expect(has(renderer, "1 free · 0 out")).toBe(true);

    await pressLabel(renderer.root, "All");
    expect(has(renderer, "4 free · 3 out")).toBe(true);

    await pressLabel(renderer.root, "Warehouse");
    expect(has(renderer, "No warehouse pianos.")).toBe(true);
  });

  it("shows five of a long list, and the rest when asked", async () => {
    const many = Array.from({ length: 8 }, (_, i) => idle(`p${i}`, `Piano ${i + 1}`));
    const renderer = await open(many);

    expect(rows(renderer)).toHaveLength(5);
    await pressButton(renderer.root, "Show 3 more");
    expect(rows(renderer)).toHaveLength(8);
    expect(() => findButton(renderer.root, "Show 3 more")).toThrow();
  });

  it("says when nothing is free, and when the first piano comes back", async () => {
    const renderer = await open([weber, kawai]);

    expect(has(renderer, "Nothing free on 29 September")).toBe(true);
    expect(
      has(
        renderer,
        "Every rentable piano is out. The first one to come back is Weber W-121, free from 21 Oct."
      )
    ).toBe(true);
    expect(has(renderer, "0 free · 2 out")).toBe(true);
    // The out pianos are still listed
    expect(rows(renderer)).toHaveLength(2);
  });

  it("takes the button under that to Back soon", async () => {
    const renderer = await open([weber, kawai]);

    await pressButton(renderer.root, "See what is back soon");
    expect(has(renderer, "Ending in the next 30 days · 1")).toBe(true);
  });

  it("says there are no pianos when the account has none", async () => {
    const renderer = await open([]);

    expect(has(renderer, "No pianos yet")).toBe(true);
    await pressButton(renderer.root, "Add a piano");
    expect(router.push).toHaveBeenCalledWith("/create");
  });

  it("says it could not load the pianos when that failed and there are none", async () => {
    const renderer = await open([], "failed");
    expect(has(renderer, "Couldn’t load your pianos")).toBe(true);
  });

  it("waits for the kept rentals rather than show a piano as free that was out", async () => {
    let finish!: (entries: any[]) => void;
    jest.mocked(getRentalHistory).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const renderer = await open();

    expect(rows(renderer)).toEqual([]);
    expect(has(renderer, "Tuesday 29 September")).toBe(false);
    await (async () => {
      finish([]);
      await flushPromises();
    })();
    expect(rows(renderer).length).toBeGreaterThan(0);
  });

  it("shows the screen when the kept rentals can't be loaded", async () => {
    jest.mocked(getRentalHistory).mockRejectedValue(new Error("offline"));
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const renderer = await open();

    expect(rows(renderer).length).toBeGreaterThan(0);
  });
});

describe("Back soon", () => {
  const openSoon = async (items = stock) => {
    const renderer = await open(items);
    await pressButton(renderer.root, "Back soon");
    return renderer;
  };

  it("lists what has ended and what ends in the next 30 days", async () => {
    const renderer = await openSoon();

    expect(has(renderer, "Ended, not back · 1")).toBe(true);
    expect(has(renderer, "Ending in the next 30 days · 1")).toBe(true);
    expect(rows(renderer)).toEqual([
      "Young Chang U-121, Meera Kapoor · 7 days ago, Ended 22 Sep",
      "Weber W-121, Karan Malhotra · free from 21 Oct, Ends 20 Oct",
    ]);
    // No end date, no mention
    expect(has(renderer, "A rental with no end date isn’t listed. Tap a piano to extend it or mark it as returned.")).toBe(
      true
    );
  });

  it("opens the piano of a row", async () => {
    const renderer = await openSoon();

    await pressLabel(renderer.root, "Weber W-121, Karan Malhotra · free from 21 Oct, Ends 20 Oct");
    expect(router.push).toHaveBeenCalledWith("/detail/weber");
  });

  it("says when there is nothing to list", async () => {
    const renderer = await openSoon([samick, petrof]);

    expect(has(renderer, "Nothing is waiting to come back, and no rental ends in the next 30 days.")).toBe(true);
  });

  it("goes back to On a day", async () => {
    const renderer = await openSoon();

    await pressButton(renderer.root, "On a day");
    expect(has(renderer, "September 2026")).toBe(true);
  });
});

describe("the back button", () => {
  it("goes back, or to the Pianos tab when there is nowhere to go back to", async () => {
    const renderer = await open();
    await pressLabel(renderer.root, "Back");
    expect(router.back).toHaveBeenCalled();

    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    await pressLabel(renderer.root, "Back");
    expect(router.replace).toHaveBeenCalledWith("/home");
  });
});

describe("for a screen reader and a thumb", () => {
  it("has a name and a role on everything that can be pressed, and none too small", async () => {
    const renderer = await open();
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);

    await pressButton(renderer.root, "Back soon");
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("at a big Font size", () => {
  atFontScale(1.5);

  const sideTexts = (renderer: Rendered) =>
    renderer.root.findAll(
      (node) =>
        (node.type as unknown) === "Text" && StyleSheet.flatten(node.props.style)?.maxWidth === "42%"
    );

  it("puts the line of a row under its words instead of squeezing the title", async () => {
    const renderer = await open();

    expect(sideTexts(renderer)).toHaveLength(0);
    // The words are still there, once each
    expect(texts(renderer).filter((text) => text === "Until 20 Oct")).toHaveLength(1);
    expect(texts(renderer).filter((text) => text === "Ended 22 Sep, not back")).toHaveLength(1);
  });

  it("gives no pressable a fixed height under 44, and nothing is cut by a height", async () => {
    const renderer = await open();
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);

    const heights = renderer.root
      .findAll((node) => (node.type as unknown) === "Text")
      .filter((node) => typeof StyleSheet.flatten(node.props.style)?.height === "number");
    expect(heights).toEqual([]);
  });
});

describe("at 100% text", () => {
  it("keeps the line of a row on the right", async () => {
    const renderer = await open();

    const side = renderer.root.findAll(
      (node) =>
        (node.type as unknown) === "Text" && StyleSheet.flatten(node.props.style)?.maxWidth === "42%"
    );
    expect(side.length).toBeGreaterThan(0);
  });
});
