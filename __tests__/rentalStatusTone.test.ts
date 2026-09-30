import { colors } from "@/constants/theme";
import { getRemainingPeriod, getRentalState } from "@/utils/dates";
import {
  getPianoRentalStatus,
  getRentalStatus,
  getRentalStatusText,
  isEndingSoon,
  STATUS_TONE_COLORS,
} from "@/utils/rentalStatus";
import { makePiano } from "./helpers/fixtures";

// Every date below is counted from this day (in the app's users' time zone)
const TODAY = new Date(2026, 8, 29, 12, 0, 0);

beforeEach(() => {
  jest.useFakeTimers({ now: TODAY });
});

afterEach(() => {
  jest.useRealTimers();
});

/** The status of a rental that ends on `end` ("YYYY-MM-DD"). */
const statusOn = (end: string) =>
  getRentalStatus(getRentalState(end), getRemainingPeriod(end));

describe("an overdue rental", () => {
  it("says how many days late it is, in red", () => {
    expect(statusOn("2026-09-28")).toEqual({ text: "Overdue · 1 day", tone: "late" });
    expect(statusOn("2026-09-11")).toEqual({ text: "Overdue · 18 days", tone: "late" });
  });

  it("counts days up to 59, then months", () => {
    expect(statusOn("2026-08-01")?.text).toBe("Overdue · 59 days");
    // 60 days ago is one whole month and a bit
    expect(statusOn("2026-07-31")?.text).toBe("Overdue · 1 month");
    expect(statusOn("2026-05-29")?.text).toBe("Overdue · 4 months");
    expect(statusOn("2025-12-29")).toEqual({ text: "Overdue · 9 months", tone: "late" });
  });

  it("keeps counting in months past a year", () => {
    expect(statusOn("2025-06-29")?.text).toBe("Overdue · 15 months");
  });
});

describe("a rental ending today", () => {
  it("says so, in the ending soon tone", () => {
    expect(statusOn("2026-09-29")).toEqual({ text: "Ends today", tone: "soon" });
  });
});

describe("a rental about to end", () => {
  it("says when, up to 7 days out", () => {
    expect(statusOn("2026-09-30")).toEqual({ text: "Ends in 1 day", tone: "soon" });
    expect(statusOn("2026-10-02")).toEqual({ text: "Ends in 3 days", tone: "soon" });
    expect(statusOn("2026-10-06")).toEqual({ text: "Ends in 7 days", tone: "soon" });
  });
});

describe("a rental with time left", () => {
  it("says how long is left, from 8 days out, in the normal tone", () => {
    expect(statusOn("2026-10-07")).toEqual({ text: "8 days left", tone: "normal" });
    expect(statusOn("2026-10-11")).toEqual({ text: "12 days left", tone: "normal" });
    expect(statusOn("2026-11-27")?.text).toBe("59 days left");
  });

  it("switches to months at 60 days", () => {
    expect(statusOn("2026-11-28")).toEqual({ text: "1 month left", tone: "normal" });
    expect(statusOn("2026-11-30")).toEqual({ text: "2 months left", tone: "normal" });
    expect(statusOn("2027-09-29")?.text).toBe("12 months left");
  });
});

describe("the boundary between ending soon and time left", () => {
  it("is the same one the rest of the app uses for ending soon", () => {
    for (let days = 1; days <= 20; days++) {
      const end = new Date(2026, 8, 29 + days);
      const stored = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      const remaining = getRemainingPeriod(stored);

      expect(statusOn(stored)?.tone === "soon").toBe(isEndingSoon(remaining));
    }
  });

  it("leaves the old status text alone, which the old screens still show", () => {
    const cases: [string, string][] = [
      ["2026-09-11", "Expired 2 weeks ago"],
      ["2026-09-29", "Due today"],
      ["2026-10-02", "3 days remaining"],
    ];
    for (const [end, oldText] of cases) {
      expect(getRentalStatusText(getRentalState(end), getRemainingPeriod(end))).toBe(oldText);
      expect(statusOn(end)).not.toBeNull();
    }
  });
});

describe("no rental", () => {
  it("has no status", () => {
    expect(getRentalStatus(null, getRemainingPeriod(undefined))).toBeNull();
  });
});

describe("a piano's status", () => {
  const rentable = { category: "rentable", sold_date: undefined } as const;

  it("comes from its rental end date", () => {
    expect(
      getPianoRentalStatus({ ...rentable, rental_period_end: "2026-10-02" as any })
    ).toEqual({ text: "Ends in 3 days", tone: "soon" });
    expect(
      getPianoRentalStatus({ ...rentable, rental_period_end: "2026-09-11" as any })
    ).toEqual({ text: "Overdue · 18 days", tone: "late" });
  });

  it("reads the stored date shapes Appwrite returns", () => {
    expect(
      getPianoRentalStatus({
        ...rentable,
        rental_period_end: "2026-10-11T00:00:00.000+00:00" as any,
      })?.text
    ).toBe("12 days left");
  });

  it("works on a whole piano", () => {
    const piano = makePiano({
      category: "rentable",
      rental_period_end: "2026-10-02" as any,
    });

    expect(getPianoRentalStatus(piano)?.tone).toBe("soon");
  });

  it("is missing for a piano that isn't a rental", () => {
    for (const category of ["events", "on_sale", "warehouse"]) {
      expect(
        getPianoRentalStatus({
          category,
          // Dates left over from when it was rented don't count
          rental_period_end: "2026-09-11" as any,
          sold_date: undefined,
        })
      ).toBeNull();
    }
  });

  it("is missing for a rental that was sold", () => {
    expect(
      getPianoRentalStatus({
        ...rentable,
        rental_period_end: "2026-09-11" as any,
        sold_date: "2026-09-20" as any,
      })
    ).toBeNull();
  });

  it("is missing for a rental with no end date", () => {
    expect(getPianoRentalStatus({ ...rentable, rental_period_end: undefined })).toBeNull();
  });
});

describe("status colours", () => {
  it("are red for late, orange text for ending soon and grey for the rest", () => {
    expect(STATUS_TONE_COLORS).toEqual({
      late: "#C4321C",
      soon: "#A85D00",
      normal: "#6B665D",
    });
    expect(STATUS_TONE_COLORS.late).toBe(colors.late);
    expect(STATUS_TONE_COLORS.soon).toBe(colors.brandText);
    expect(STATUS_TONE_COLORS.normal).toBe(colors.ink2);
  });
});
