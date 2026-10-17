import { addDays, format } from "date-fns";
import {
  availabilityOn,
  backSoon,
  BACK_SOON_DAYS,
  dayText,
  endDaysInMonth,
  freeFromDay,
} from "@/utils/availability";
import { monthRows } from "@/utils/monthGrid";
import { makePiano } from "./helpers/fixtures";

/** Which pianos are free on a day, and which come back soon. Today is Tuesday 29 September 2026. */

const TODAY = new Date(2026, 8, 29);
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const at = (offset: number) => addDays(TODAY, offset);
const stored = (offset: number) => format(at(offset), "yyyy-MM-dd");

const rented = (id: string, startOffset: number | null, endOffset: number | null, extra: Record<string, unknown> = {}) =>
  makePiano({
    $id: id,
    title: `Piano ${id}`,
    category: "rentable",
    company_associated: "Kirpalsons",
    rental_customer_name: `Customer ${id}`,
    rental_period_start: (startOffset === null ? null : stored(startOffset)) as any,
    rental_period_end: (endOffset === null ? null : stored(endOffset)) as any,
    ...extra,
  } as any);

const idle = (id: string, extra: Record<string, unknown> = {}) =>
  makePiano({
    $id: id,
    title: `Piano ${id}`,
    category: "rentable",
    company_associated: "Kirpalsons",
    ...extra,
  } as any);

const kept = (pianoId: string, startOffset: number | null, endOffset: number | null, closedOffset: number, extra = {}) =>
  ({
    $id: `kept-${pianoId}-${startOffset}`,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: pianoId,
    creator: "account-1",
    customer_name: "Ravi Kumar",
    period_start: startOffset === null ? null : stored(startOffset),
    period_end: endOffset === null ? null : stored(endOffset),
    closed_on: stored(closedOffset),
    reason: "ended",
    ...extra,
  }) as any;

const on = (pianos: any[], history: any[], offset: number, filter: any = "rentable") =>
  availabilityOn(pianos, history, at(offset), filter, TODAY);
const titles = (entries: { piano: { title: string } }[]) => entries.map((entry) => entry.piano.title);

describe("a rental on a piano", () => {
  const piano = rented("a", -20, 10);

  it("has it out up to and including its last day", () => {
    const result = on([piano], [], 10);
    expect(titles(result.out)).toEqual(["Piano a"]);
    expect(result.out[0].line).toEqual({ text: "Until 9 Oct", tone: "normal" });
    expect(result.out[0].who).toBe("Customer a");
    expect(result.out[0].sub).toBe("Customer a");
  });

  it("frees it the day after, and says from when", () => {
    const result = on([piano], [], 11);
    expect(titles(result.free)).toEqual(["Piano a"]);
    expect(result.free[0].line).toEqual({ text: "Free from 10 Oct", tone: "normal" });
  });

  it("has it out on the first day and free the day before it, until then", () => {
    const later = rented("b", 15, 40);
    expect(on([later], [], 14).free[0].line).toEqual({ text: "Free until 13 Oct", tone: "soon" });
    expect(titles(on([later], [], 15).out)).toEqual(["Piano b"]);
  });

  it("is free before a rental with a start in the future, which the rest of the app already counts as rented", () => {
    const later = rented("b", 15, 40);
    const result = on([later], [], 0);
    expect(titles(result.free)).toEqual(["Piano b"]);
    expect(result.out).toEqual([]);
  });

  it("says nothing about the past for a piano that was never rented", () => {
    const result = on([idle("c")], [], 5);
    expect(result.free[0].line).toBeNull();
    expect(result.free[0].sub).toBe("Rentable · Kirpalsons");
  });

  it("is not back once it has ended and the piano has not been marked as returned", () => {
    const ended = rented("d", -60, -9);
    const result = on([ended], [], 12);
    expect(result.out[0].line).toEqual({ text: "Ended 20 Sep, not back", tone: "late" });
    expect(result.out[0].freeFrom).toBeNull();
    // On the days it was out as agreed it reads as it did
    expect(on([ended], [], -20).out[0].line).toEqual({ text: "Until 20 Sep", tone: "normal" });
    // And before it began, the piano was free
    expect(titles(on([ended], [], -70).free)).toEqual(["Piano d"]);
  });

  it("stays out from its start with no end date, saying so", () => {
    const open = rented("e", -10, null);
    expect(on([open], [], 90).out[0].line).toEqual({ text: "No end date", tone: "normal" });
    expect(titles(on([open], [], -11).free)).toEqual(["Piano e"]);
  });

  it("counts a customer with no dates at all as out", () => {
    const nameOnly = rented("f", null, null);
    expect(titles(on([nameOnly], [], 3).out)).toEqual(["Piano f"]);
  });
});

describe("kept rentals", () => {
  it("have the piano out on their days, and free after them", () => {
    const piano = idle("a");
    const history = [kept("a", -100, -80, -80)];
    expect(on([piano], history, -90).out[0].line).toEqual({ text: "Until 11 Jul", tone: "normal" });
    expect(on([piano], history, -90).out[0].who).toBe("Ravi Kumar");
    const after = on([piano], history, -79);
    expect(after.free[0].line).toEqual({ text: "Free since 12 Jul", tone: "normal" });
  });

  it("say Free until when another has been kept for a later day", () => {
    const piano = idle("a");
    const history = [kept("a", -50, -40, -40), kept("a", -10, -5, -5)];
    expect(on([piano], history, -30).free[0].line).toEqual({ text: "Free until 18 Sep", tone: "soon" });
    expect(on([piano], history, 0).free[0].line).toEqual({ text: "Free since 25 Sep", tone: "normal" });
  });

  it("end the day they were closed when that was before the agreed end", () => {
    const piano = idle("a");
    // Agreed to the 9th of October, ended on the 1st
    const history = [kept("a", -30, 10, -2)];
    expect(titles(on([piano], history, -2).out)).toEqual(["Piano a"]);
    expect(titles(on([piano], history, -1).free)).toEqual(["Piano a"]);
  });

  it("end the day they were closed when they have no end", () => {
    const piano = idle("a");
    const history = [kept("a", -30, null, -3)];
    expect(titles(on([piano], history, -3).out)).toEqual(["Piano a"]);
    expect(titles(on([piano], history, -2).free)).toEqual(["Piano a"]);
  });

  it("are left out when they have no start, or end before they start", () => {
    const piano = idle("a");
    expect(on([piano], [kept("a", null, -5, -5)], -10).out).toEqual([]);
    expect(on([piano], [kept("a", -3, -8, -8)], -5).out).toEqual([]);
  });

  it("belong to their own piano only", () => {
    const history = [kept("a", -100, -80, -80)];
    const result = on([idle("a"), idle("b")], history, -90);
    expect(titles(result.out)).toEqual(["Piano a"]);
    expect(titles(result.free)).toEqual(["Piano b"]);
  });

  it("are overruled by the rental on the piano", () => {
    // A kept rental that was agreed past the day the next began
    const piano = rented("a", -5, 20);
    const history = [kept("a", -40, 5, -5)];
    const result = on([piano], history, 0);
    expect(result.out[0].who).toBe("Customer a");
  });
});

describe("which pianos are asked about", () => {
  const pianos = [
    rented("r", -5, 20),
    idle("r2"),
    idle("e", { category: "events", title: "Piano e", company_associated: "Shamshersons" }),
    idle("w", { category: "warehouse", title: "Piano w", company_associated: "Shamshersons" }),
    idle("s", { category: "on_sale", title: "Piano s" }),
    idle("x", { category: "rentable", title: "Piano x", sold_date: stored(-30) as any }),
  ];

  it("is rentable pianos unless another kind is chosen", () => {
    const result = on(pianos, [], 0);
    expect(titles(result.free)).toEqual(["Piano r2"]);
    expect(titles(result.out)).toEqual(["Piano r"]);
  });

  it("can be events or the warehouse, which have no rentals and are free", () => {
    expect(titles(on(pianos, [], 0, "events").free)).toEqual(["Piano e"]);
    expect(on(pianos, [], 0, "events").free[0].sub).toBe("Events · Shamshersons");
    expect(titles(on(pianos, [], 0, "warehouse").free)).toEqual(["Piano w"]);
  });

  it("can be all of them, never the ones on sale or sold", () => {
    const result = on(pianos, [], 0, "all");
    expect(titles(result.free)).toEqual(["Piano e", "Piano r2", "Piano w"]);
    expect(titles(result.out)).toEqual(["Piano r"]);
  });

  it("leaves a sold piano out, whatever rental it still has", () => {
    const sold = rented("z", -5, 20, { sold_date: stored(-1) as any });
    expect(on([sold], [], 0)).toEqual({ free: [], out: [], firstBack: null });
  });
});

describe("the order of the lists", () => {
  it("puts free pianos A to Z", () => {
    const result = on([idle("c"), idle("a"), idle("b")], [], 0);
    expect(titles(result.free)).toEqual(["Piano a", "Piano b", "Piano c"]);
  });

  it("puts out pianos that are not back first, then the soonest back, then those with no end date", () => {
    const pianos = [
      rented("late", -60, -3),
      rented("far", -10, 40),
      rented("near", -10, 5),
      rented("open", -10, null),
    ];
    const result = on(pianos, [], 0);
    expect(titles(result.out)).toEqual(["Piano late", "Piano near", "Piano far", "Piano open"]);
  });

  it("names the first piano back, with its day", () => {
    const pianos = [rented("far", -10, 40), rented("near", -10, 5), rented("late", -60, -3)];
    const result = on(pianos, [], 0);
    expect(result.firstBack?.piano.title).toBe("Piano near");
    expect(format(result.firstBack!.freeFrom!, "d MMM")).toBe("5 Oct");
  });

  it("has nobody to name when no out piano has an end day", () => {
    expect(on([rented("late", -60, -3), rented("open", -10, null)], [], 0).firstBack).toBeNull();
  });
});

describe("the days a rental ends", () => {
  it("are the ends in the month, from the rental on a piano and from kept ones", () => {
    const pianos = [rented("a", -5, 7), rented("b", -5, 3), idle("c")];
    const history = [kept("c", -20, -10, -10), kept("c", -40, -35, -35)];
    // October 2026: the 2nd and the 6th; September: the 19th; August: the 25th
    expect([...endDaysInMonth(pianos, history, new Date(2026, 9, 1))].sort((a, b) => a - b)).toEqual([2, 6]);
    expect([...endDaysInMonth(pianos, history, new Date(2026, 8, 1))]).toEqual([19]);
    expect([...endDaysInMonth(pianos, history, new Date(2026, 7, 1))]).toEqual([25]);
    expect(endDaysInMonth(pianos, history, new Date(2025, 8, 1)).size).toBe(0);
  });

  it("leave out rentals with no end, other kinds of piano and sold ones", () => {
    const pianos = [
      rented("a", -5, null),
      rented("b", -5, 3, { category: "events" }),
      rented("c", -5, 4, { sold_date: stored(-1) as any }),
    ];
    expect(endDaysInMonth(pianos, [], new Date(2026, 9, 1)).size).toBe(0);
    expect(endDaysInMonth(pianos, [], new Date(2026, 9, 1), "all").size).toBe(0);
  });
});

describe("Back soon", () => {
  it("lists rentals that have ended and are not back, the longest ago first", () => {
    const result = backSoon([rented("a", -60, -3), rented("b", -90, -40), rented("c", -30, 5)], TODAY);
    expect(titles(result.notBack)).toEqual(["Piano b", "Piano a"]);
    expect(result.notBack[0].sub).toBe("Customer b · 40 days ago");
    expect(result.notBack[0].line).toEqual({ text: "Ended 20 Aug", tone: "late" });
  });

  it("counts a long time ago in months", () => {
    const result = backSoon([rented("a", -400, -100)], TODAY);
    expect(result.notBack[0].sub).toBe("Customer a · 3 months ago");
  });

  it("lists rentals ending in the next 30 days, the soonest first, today included", () => {
    const result = backSoon(
      [rented("far", -10, BACK_SOON_DAYS), rented("near", -10, 4), rented("today", -10, 0), rented("beyond", -10, BACK_SOON_DAYS + 1)],
      TODAY
    );
    expect(titles(result.ending)).toEqual(["Piano today", "Piano near", "Piano far"]);
    expect(result.ending[0].line).toEqual({ text: "Ends today", tone: "soon" });
    expect(result.ending[1].line).toEqual({ text: "Ends 3 Oct", tone: "soon" });
    expect(result.ending[2].line).toEqual({ text: "Ends 29 Oct", tone: "normal" });
    expect(result.ending[1].sub).toBe("Customer near · free from 4 Oct");
  });

  it("leaves out rentals with no end date, sold pianos and pianos that are not rentable", () => {
    const result = backSoon(
      [
        rented("open", -10, null),
        rented("sold", -10, 5, { sold_date: stored(-1) as any }),
        rented("warehouse", -10, 5, { category: "warehouse" }),
        idle("idle"),
      ],
      TODAY
    );
    expect(result).toEqual({ notBack: [], ending: [] });
  });

  it("names no customer when there is none", () => {
    const result = backSoon([rented("a", -10, 5, { rental_customer_name: "" })], TODAY);
    expect(result.ending[0].sub).toBe("free from 5 Oct");
  });
});

describe("the day a piano is free from", () => {
  it("is the day after the last day of a rental that is on", () => {
    expect(format(freeFromDay(rented("a", -5, 10))!, "d MMM yyyy")).toBe("10 Oct 2026");
    expect(format(freeFromDay(rented("a", -5, 0))!, "d MMM yyyy")).toBe("30 Sep 2026");
  });

  it("is none for an ended rental, one with no end, a sold piano or another kind", () => {
    expect(freeFromDay(rented("a", -50, -1))).toBeNull();
    expect(freeFromDay(rented("a", -5, null))).toBeNull();
    expect(freeFromDay(rented("a", -5, 10, { sold_date: stored(-1) as any }))).toBeNull();
    expect(freeFromDay(rented("a", -5, 10, { category: "events" }))).toBeNull();
  });
});

describe("how a day is written", () => {
  it("leaves the year out in the year of the day being asked about", () => {
    expect(dayText(new Date(2026, 9, 2), new Date(2026, 0, 15))).toBe("2 Oct");
  });

  it("adds the year in another year", () => {
    expect(dayText(new Date(2027, 1, 28), new Date(2026, 9, 15))).toBe("28 Feb 2027");
  });
});

describe("the weeks of a month", () => {
  it("start on Monday and have full rows", () => {
    // November 2026 begins on a Sunday: six blanks, then the 1st
    const rows = monthRows(new Date(2026, 10, 15));
    expect(rows.every((row) => row.length === 7)).toBe(true);
    expect(rows[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(rows[0][6]?.getDate()).toBe(1);
    expect(rows.flat().filter(Boolean)).toHaveLength(30);
    expect(rows).toHaveLength(6);
  });

  it("takes only four rows when February begins on a Monday", () => {
    // February 2027 begins on a Monday and has 28 days
    const rows = monthRows(new Date(2027, 1, 10));
    expect(rows).toHaveLength(4);
    expect(rows[0][0]?.getDate()).toBe(1);
    expect(rows[3][6]?.getDate()).toBe(28);
  });

  it("takes six rows when a long month begins late in the week", () => {
    // August 2026 begins on a Saturday and has 31 days
    expect(monthRows(new Date(2026, 7, 1))).toHaveLength(6);
  });

  it("starts a month that begins on a Monday with the 1st", () => {
    // June 2026 begins on a Monday
    expect(monthRows(new Date(2026, 5, 20))[0][0]?.getDate()).toBe(1);
  });
});
