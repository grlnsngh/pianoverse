import { ALL_PAYMENTS_FROM, exportPeriods } from "@/utils/exportPeriods";

/** The stretches payments can be downloaded for. Financial years run 1 April to 31 March. */

const at = (year: number, month: number, day: number) => new Date(year, month - 1, day, 15, 30);
const byKey = (today: Date) => Object.fromEntries(exportPeriods(today).map((period) => [period.key, period]));

describe("the periods to download payments for", () => {
  it("are this month, last month, this financial year, last financial year and all, in that order", () => {
    expect(exportPeriods(at(2026, 10, 1)).map((period) => [period.key, period.label])).toEqual([
      ["this-month", "This month"],
      ["last-month", "Last month"],
      ["this-financial-year", "This financial year"],
      ["last-financial-year", "Last financial year"],
      ["all", "All payments"],
    ]);
  });

  it("have this month from its first day up to the first of the next", () => {
    const { "this-month": month } = byKey(at(2026, 10, 15));

    expect(month.from).toEqual(new Date(2026, 9, 1));
    expect(month.to).toEqual(new Date(2026, 10, 1));
    expect(month.detail).toBe("October 2026");
    expect(month.slug).toBe("2026-10");
  });

  it("have last month up to the first of this one", () => {
    const { "last-month": month } = byKey(at(2026, 10, 15));

    expect(month.from).toEqual(new Date(2026, 8, 1));
    expect(month.to).toEqual(new Date(2026, 9, 1));
    expect(month.detail).toBe("September 2026");
    expect(month.slug).toBe("2026-09");
  });

  it("have last month in the year before, in January", () => {
    const { "last-month": month, "this-month": now } = byKey(at(2027, 1, 20));

    expect(month.from).toEqual(new Date(2026, 11, 1));
    expect(month.to).toEqual(new Date(2027, 0, 1));
    expect(month.slug).toBe("2026-12");
    expect(now.to).toEqual(new Date(2027, 1, 1));
  });

  it("have this financial year from the April of this year, from April on", () => {
    const { "this-financial-year": year } = byKey(at(2026, 10, 1));

    expect(year.from).toEqual(new Date(2026, 3, 1));
    expect(year.to).toEqual(new Date(2027, 3, 1));
    expect(year.detail).toBe("Apr 2026 – Mar 2027");
    expect(year.slug).toBe("fy-2026-27");
  });

  it("have this financial year from the April of last year, from January to March", () => {
    const { "this-financial-year": year, "last-financial-year": last } = byKey(at(2027, 2, 10));

    expect(year.from).toEqual(new Date(2026, 3, 1));
    expect(year.to).toEqual(new Date(2027, 3, 1));
    expect(year.slug).toBe("fy-2026-27");
    expect(last.from).toEqual(new Date(2025, 3, 1));
    expect(last.to).toEqual(new Date(2026, 3, 1));
    expect(last.detail).toBe("Apr 2025 – Mar 2026");
    expect(last.slug).toBe("fy-2025-26");
  });

  it("change over at midnight between 31 March and 1 April", () => {
    expect(byKey(at(2026, 3, 31))["this-financial-year"].slug).toBe("fy-2025-26");
    expect(byKey(at(2026, 4, 1))["this-financial-year"].slug).toBe("fy-2026-27");
  });

  it("have last financial year end where this one starts", () => {
    for (const today of [at(2026, 4, 1), at(2026, 12, 31), at(2027, 3, 31)]) {
      const { "this-financial-year": year, "last-financial-year": last } = byKey(today);
      expect(last.to).toEqual(year.from);
    }
  });

  it("have a slug that tells the century apart for a year ending in 00", () => {
    expect(byKey(at(2099, 6, 1))["this-financial-year"].slug).toBe("fy-2099-00");
  });

  it("have all from before the app to the end of this month", () => {
    const { all } = byKey(at(2026, 10, 15));

    expect(all.from).toEqual(ALL_PAYMENTS_FROM);
    expect(all.from.getFullYear()).toBe(2000);
    expect(all.to).toEqual(new Date(2026, 10, 1));
    expect(all.slug).toBe("all");
    expect(all.detail).toBe("Everything you have recorded");
  });

  it("end on a first day that isn't part of them, and never before they start", () => {
    for (const period of exportPeriods(at(2026, 10, 1))) {
      expect(period.to.getTime()).toBeGreaterThan(period.from.getTime());
      expect(period.to.getDate()).toBe(1);
    }
  });

  it("use today by default", () => {
    jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });

    expect(exportPeriods()[0].detail).toBe("September 2026");

    jest.useRealTimers();
  });
});
