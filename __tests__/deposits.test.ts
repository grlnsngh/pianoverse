import { addDays, format } from "date-fns";
import {
  depositAmount,
  depositHeldLine,
  depositsHeld,
  dropsOldDeposit,
  heldDeposit,
  heldSummary,
  rentalsText,
  sinceText,
  suggestedDeposit,
} from "@/utils/deposits";
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

  it("says the deposit isn't settled", () => {
    expect(pastRentalDeposit(kept({ deposit: 9000 }))).toBe("Deposit ₹9,000 · not settled");
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
