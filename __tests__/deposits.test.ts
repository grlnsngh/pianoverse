import { addDays, format } from "date-fns";
import {
  depositAmount,
  depositHeldLine,
  depositsHeld,
  dropsOldDeposit,
  heldDeposit,
  heldSummary,
  rentalsText,
  settleDeposit,
  sinceText,
  suggestedDeposit,
} from "@/utils/deposits";
import { settlementLine } from "@/utils/depositLines";
import { pastRentalDeposit } from "@/utils/customers";
import { makePiano } from "./helpers/fixtures";

/** Security deposits: what is held, what it adds up to, and what a new rental does with it. Today is 29 September 2026. */

const TODAY = new Date(2026, 8, 29);
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const stored = (offset: number) => format(addDays(TODAY, offset), "yyyy-MM-dd");

const rented = (id: string, extra: Record<string, unknown> = {}) =>
  makePiano({
    $id: id,
    title: `Piano ${id}`,
    category: "rentable",
    rental_customer_name: `Customer ${id}`,
    rental_period_start: stored(-30) as any,
    rental_period_end: stored(60) as any,
    rental_price: 4500,
    ...extra,
  } as any);

describe("the deposit on a piano", () => {
  it("is the amount, or nothing when there is none, or when it isn't a positive number", () => {
    expect(depositAmount(rented("a", { rental_deposit: 9000 }))).toBe(9000);
    expect(depositAmount(rented("a"))).toBe(0);
    expect(depositAmount(rented("a", { rental_deposit: null }))).toBe(0);
    expect(depositAmount(rented("a", { rental_deposit: 0 }))).toBe(0);
    expect(depositAmount(rented("a", { rental_deposit: -5 }))).toBe(0);
  });

  it("is offered as two months' rent", () => {
    expect(suggestedDeposit(4500)).toBe(9000);
    expect(suggestedDeposit(0)).toBe(0);
  });
});

describe("a deposit that is held", () => {
  it("is a deposit on a rented piano, with who it is for and the day it was received", () => {
    const held = heldDeposit(rented("a", { rental_deposit: 9000, deposit_received_on: stored(-29) }));

    expect(held).toMatchObject({ amount: 9000, who: "Customer a" });
    expect(held!.since).toEqual(addDays(TODAY, -29));
  });

  it("needs a rental on the piano: a customer or a start date", () => {
    expect(heldDeposit(rented("a", { rental_deposit: 9000, rental_customer_name: "", rental_period_start: null }))).toBeNull();
    expect(
      heldDeposit(rented("a", { rental_deposit: 9000, rental_customer_name: "", rental_period_start: stored(-5) }))
    ).toMatchObject({ amount: 9000, who: null });
  });

  it("is not held on a sold piano, a piano that isn't a rental, or one with no deposit", () => {
    expect(heldDeposit(rented("a", { rental_deposit: 9000, sold_date: stored(-1) }))).toBeNull();
    expect(heldDeposit(rented("a", { rental_deposit: 9000, category: "warehouse" }))).toBeNull();
    expect(heldDeposit(rented("a"))).toBeNull();
  });

  it("has no day when none was saved", () => {
    expect(heldDeposit(rented("a", { rental_deposit: 9000 }))!.since).toBeNull();
  });
});

describe("what is held in all", () => {
  it("adds up the deposits, the one held longest first and those with no day last", () => {
    const pianos = [
      rented("newer", { rental_deposit: 8000, deposit_received_on: stored(-10) }),
      rented("nodate", { rental_deposit: 1000 }),
      rented("older", { rental_deposit: 9000, deposit_received_on: stored(-60) }),
      rented("none"),
      rented("sold", { rental_deposit: 5000, sold_date: stored(-1) }),
    ];

    const held = depositsHeld(pianos);

    expect(held.total).toBe(18000);
    expect(held.entries.map((entry) => entry.piano.title)).toEqual(["Piano older", "Piano newer", "Piano nodate"]);
  });

  it("is nothing when no deposit is held", () => {
    expect(depositsHeld([rented("a"), rented("b")])).toEqual({ total: 0, entries: [] });
    expect(depositsHeld([])).toEqual({ total: 0, entries: [] });
  });

  it("says how many rentals, in the singular for one", () => {
    expect(rentalsText(1)).toBe("1 rental");
    expect(rentalsText(3)).toBe("3 rentals");
    expect(heldSummary(depositsHeld([rented("a", { rental_deposit: 9000 })]))).toBe("1 rental · refundable, not income");
  });
});

describe("how a deposit is described", () => {
  it("says since when, leaving the year out in this year", () => {
    expect(sinceText(new Date(2026, 8, 1), TODAY)).toBe("since 1 Sep");
    expect(sinceText(new Date(2025, 8, 1), TODAY)).toBe("since 1 Sep 2025");
    expect(sinceText(null, TODAY)).toBe("");
  });

  it("has the line for a rented piano's page: held since a day, or just held", () => {
    expect(depositHeldLine(rented("a", { rental_deposit: 9000, deposit_received_on: "2026-09-01" }), TODAY)).toBe(
      "Deposit held since 1 Sep"
    );
    expect(depositHeldLine(rented("a", { rental_deposit: 9000 }), TODAY)).toBe("Deposit held");
    expect(depositHeldLine(rented("a"), TODAY)).toBeNull();
  });
});

describe("a kept rental that held a deposit", () => {
  const kept = (extra = {}) => ({
    id: "h1",
    key: "asha mehta",
    name: "Asha Mehta",
    fromHistory: true,
    startOn: null,
    endOn: null,
    price: null,
    paymentsCount: 0,
    total: 0,
    firstPaidOn: null,
    lastPaidOn: null,
    ...extra,
  });

  it("says the deposit isn't settled until it says how it ended", () => {
    expect(pastRentalDeposit(kept({ deposit: 9000 }))).toEqual({ text: "Deposit ₹9,000 · not settled", settled: false });
    expect(pastRentalDeposit(kept({ deposit: 9000, depositRefunded: null }))).toEqual({
      text: "Deposit ₹9,000 · not settled",
      settled: false,
    });
  });

  it("says how it was settled", () => {
    expect(pastRentalDeposit(kept({ deposit: 9000, depositRefunded: 9000 }))).toEqual({
      text: "Deposit ₹9,000 · refunded in full",
      settled: true,
    });
    expect(pastRentalDeposit(kept({ deposit: 9000, depositRefunded: 4500, depositNote: "unpaid rent" }))).toEqual({
      text: "Deposit ₹9,000 · refunded ₹4,500, kept ₹4,500 for unpaid rent",
      settled: true,
    });
  });

  it("says nothing for a rental with no deposit, or one known only from payments", () => {
    expect(pastRentalDeposit(kept())).toBeNull();
    expect(pastRentalDeposit(kept({ deposit: 0 }))).toBeNull();
    expect(pastRentalDeposit(kept({ deposit: 9000, fromHistory: false }))).toBeNull();
  });
});

describe("a new rental on a piano that holds a deposit", () => {
  const before = rented("a", { rental_deposit: 9000, deposit_received_on: "2026-09-01" });
  const same = { rental_deposit: 9000, deposit_received_on: "2026-09-01" };

  it("starts without the old deposit when it was left as it was", () => {
    expect(dropsOldDeposit(before, same, true)).toBe(true);
  });

  it("keeps the deposit when the amount or the day it was received was changed", () => {
    expect(dropsOldDeposit(before, { ...same, rental_deposit: 10000 }, true)).toBe(false);
    expect(dropsOldDeposit(before, { ...same, deposit_received_on: "2026-10-01" }, true)).toBe(false);
    expect(dropsOldDeposit(before, { rental_deposit: null, deposit_received_on: null }, true)).toBe(false);
  });

  it("doesn't matter when it is the same rental carrying on", () => {
    expect(dropsOldDeposit(before, same, false)).toBe(false);
  });

  it("doesn't matter when the old rental had no deposit", () => {
    expect(dropsOldDeposit(rented("a"), { rental_deposit: null, deposit_received_on: null }, true)).toBe(false);
  });

  it("reads the day it was received however Appwrite saved it", () => {
    const stamped = rented("a", { rental_deposit: 9000, deposit_received_on: "2026-09-01T00:00:00.000+00:00" });
    expect(dropsOldDeposit(stamped, same, true)).toBe(true);
  });
});

describe("settling a deposit when the piano comes back", () => {
  const settle = (extra: Partial<Parameters<typeof settleDeposit>[0]> = {}) =>
    settleDeposit({ held: 9000, rentOwed: 0, keepRent: true, damage: 0, refund: null, ...extra });

  it("gives all of it back when nothing is owed and nothing is damaged", () => {
    expect(settle()).toEqual({ held: 9000, refund: 9000, kept: 0, forRent: 0, forDamage: 0, note: null });
  });

  it("keeps the rent that is owed, by the owner's own clause", () => {
    expect(settle({ rentOwed: 4500 })).toEqual({
      held: 9000,
      refund: 4500,
      kept: 4500,
      forRent: 4500,
      forDamage: 0,
      note: "unpaid rent",
    });
  });

  it("keeps no more rent than the deposit, whatever is owed", () => {
    expect(settle({ rentOwed: 20000 })).toMatchObject({ refund: 0, kept: 9000, forRent: 9000, note: "unpaid rent" });
  });

  it("keeps nothing for rent when that is switched off", () => {
    expect(settle({ rentOwed: 4500, keepRent: false })).toMatchObject({ refund: 9000, kept: 0, forRent: 0, note: null });
  });

  it("takes the damage charges out too, after the rent, and says so", () => {
    expect(settle({ rentOwed: 4500, damage: 1000 })).toEqual({
      held: 9000,
      refund: 3500,
      kept: 5500,
      forRent: 4500,
      forDamage: 1000,
      note: "unpaid rent and damage",
    });
    expect(settle({ damage: 1000 })).toMatchObject({ refund: 8000, forDamage: 1000, note: "damage" });
  });

  it("keeps no more damage than is left of the deposit", () => {
    expect(settle({ rentOwed: 4500, damage: 20000 })).toMatchObject({ refund: 0, forRent: 4500, forDamage: 4500 });
  });

  it("ignores a negative amount", () => {
    expect(settle({ rentOwed: -5, damage: -9 })).toMatchObject({ refund: 9000, kept: 0 });
  });

  it("gives back what the person typed instead, never more than was held or less than nothing", () => {
    expect(settle({ rentOwed: 4500, refund: 7000 })).toMatchObject({ refund: 7000, kept: 2000 });
    expect(settle({ refund: 50000 })).toMatchObject({ refund: 9000, kept: 0 });
    expect(settle({ refund: -50 })).toMatchObject({ refund: 0, kept: 9000 });
    expect(settle({ refund: 0 })).toMatchObject({ refund: 0, kept: 9000 });
  });

  it("records less rent than was owed when the refund agreed is more than the sums gave", () => {
    // 4,500 is owed but only 2,000 was kept in all, so only 2,000 can have been rent
    expect(settle({ rentOwed: 4500, refund: 7000 })).toMatchObject({ forRent: 2000, forDamage: 0, note: "unpaid rent" });
    // and none at all when everything is given back
    expect(settle({ rentOwed: 4500, refund: 9000 })).toMatchObject({ forRent: 0, note: null });
  });

  it("puts the rent first and the damage after it when less is kept than owed and damaged", () => {
    expect(settle({ rentOwed: 4500, damage: 1000, refund: 4000 })).toMatchObject({
      kept: 5000,
      forRent: 4500,
      forDamage: 500,
      note: "unpaid rent and damage",
    });
  });

  it("works in rupees and paise without drifting", () => {
    expect(settleDeposit({ held: 100.1, rentOwed: 33.3, keepRent: true, damage: 33.3, refund: null })).toMatchObject({
      refund: 33.5,
      kept: 66.6,
    });
  });

  it("can have nothing held", () => {
    expect(settleDeposit({ held: 0, rentOwed: 4500, keepRent: true, damage: 100, refund: null })).toEqual({
      held: 0,
      refund: 0,
      kept: 0,
      forRent: 0,
      forDamage: 0,
      note: null,
    });
  });
});

describe("the line about how a deposit ended", () => {
  it("is not settled with no word on it, and settled with any", () => {
    expect(settlementLine(9000, null, null)).toEqual({ text: "Deposit ₹9,000 · not settled", settled: false });
    expect(settlementLine(9000, undefined, "damage")).toEqual({ text: "Deposit ₹9,000 · not settled", settled: false });
    expect(settlementLine(9000, 9000, null).settled).toBe(true);
  });

  it("says refunded in full for all of it, or more", () => {
    expect(settlementLine(9000, 9000, "unpaid rent").text).toBe("Deposit ₹9,000 · refunded in full");
    expect(settlementLine(9000, 9500, null).text).toBe("Deposit ₹9,000 · refunded in full");
  });

  it("says what was refunded and kept, with the reason when there is one", () => {
    expect(settlementLine(9000, 4500, "unpaid rent").text).toBe("Deposit ₹9,000 · refunded ₹4,500, kept ₹4,500 for unpaid rent");
    expect(settlementLine(9000, 4500, "  ").text).toBe("Deposit ₹9,000 · refunded ₹4,500, kept ₹4,500");
    expect(settlementLine(12500.5, 2500.25, null).text).toBe("Deposit ₹12,500.5 · refunded ₹2,500.25, kept ₹10,000.25");
  });

  it("says when none was refunded", () => {
    expect(settlementLine(9000, 0, null).text).toBe("Deposit ₹9,000 · none refunded");
    expect(settlementLine(9000, 0, "damage").text).toBe("Deposit ₹9,000 · none refunded, kept for damage");
  });
});
