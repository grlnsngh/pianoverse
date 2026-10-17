import { needsAttention, rentedOut, stockCounts } from "@/utils/today";
import { rentalReturned, rentalSoldWithDeposit } from "@/utils/rentalHistory";
import { clearedRental, hasRentalToReturn, restoredDeposit, restoredRental } from "@/utils/returnPiano";
import { makePiano } from "./helpers/fixtures";

/** Marking a piano as returned: when there is a rental to return, what comes off, what is kept. Today is 29 September 2026. */

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const rented = (extra: Record<string, unknown> = {}) =>
  makePiano({
    $id: "kawai",
    title: "Kawai K-300",
    category: "rentable",
    creator: "account-1",
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "9876543210",
    rental_customer_address: "12 MG Road",
    rental_period_start: "2026-08-01" as any,
    rental_period_end: "2026-12-01" as any,
    rental_price: 4000,
    ...extra,
  });

describe("a piano with a rental to return", () => {
  it("is a rental that isn't sold, with a customer on it", () => {
    expect(hasRentalToReturn(rented())).toBe(true);
  });

  it("can have only some of the details", () => {
    for (const extra of [
      { rental_customer_mobile: null, rental_customer_address: null, rental_period_start: null, rental_period_end: null, rental_price: null },
      { rental_customer_name: "", rental_customer_address: null, rental_period_start: null, rental_period_end: null, rental_price: null },
      { rental_customer_name: "", rental_customer_mobile: "", rental_customer_address: "", rental_period_end: null, rental_price: null },
      { rental_customer_name: "", rental_customer_mobile: "", rental_customer_address: "", rental_period_start: null, rental_price: null },
      { rental_customer_name: "", rental_customer_mobile: "", rental_customer_address: "", rental_period_start: null, rental_period_end: null },
    ]) {
      expect(hasRentalToReturn(rented(extra))).toBe(true);
    }
  });

  it("is not a rentable piano with nothing on it: it is already in stock", () => {
    expect(
      hasRentalToReturn(
        rented({
          rental_customer_name: "  ",
          rental_customer_mobile: null,
          rental_customer_address: "",
          rental_period_start: null,
          rental_period_end: null,
          rental_price: null,
        })
      )
    ).toBe(false);
    expect(hasRentalToReturn(rented({ rental_price: 0, rental_customer_name: "", rental_customer_mobile: "", rental_customer_address: "", rental_period_start: null, rental_period_end: null }))).toBe(false);
  });

  it("is not a piano that isn't a rental, even with rental details left on it", () => {
    for (const category of ["warehouse", "events", "on_sale"]) {
      expect(hasRentalToReturn(rented({ category }))).toBe(false);
    }
  });

  it("is not a sold piano", () => {
    expect(hasRentalToReturn(rented({ sold_date: "2026-09-10" }))).toBe(false);
  });

  it("is a rental that has ended and hasn't come back, or one that starts later", () => {
    expect(hasRentalToReturn(rented({ rental_period_end: "2026-05-01" }))).toBe(true);
    expect(hasRentalToReturn(rented({ rental_period_start: "2027-01-01", rental_period_end: "2027-06-01" }))).toBe(true);
  });
});

describe("what comes off the piano", () => {
  it("is every rental detail, and nothing else", () => {
    expect(clearedRental()).toEqual({
      rental_customer_name: null,
      rental_customer_mobile: null,
      rental_customer_address: null,
      rental_period_start: null,
      rental_period_end: null,
      rental_price: null,
      // The deposit goes with the rental
      rental_deposit: null,
      deposit_received_on: null,
    });
  });

  it("puts the piano in stock: it isn't out, doesn't need attention and isn't on the shelf", () => {
    const back = { ...rented(), ...clearedRental() } as any;
    expect(rentedOut([back])).toEqual([]);
    expect(needsAttention([back])).toEqual([]);
    expect(stockCounts([back])).toMatchObject({ inStock: 1, onRent: 0 });
    expect(hasRentalToReturn(back)).toBe(false);
  });

  it("is what an ended rental that was never returned needed: it leaves Needs attention", () => {
    const overdue = rented({ rental_period_end: "2026-05-01" });
    expect(needsAttention([overdue])).toHaveLength(1);

    expect(needsAttention([{ ...overdue, ...clearedRental() } as any])).toEqual([]);
  });
});

describe("what puts it back (Undo)", () => {
  it("is the rental as it was, with the days as they are saved", () => {
    expect(restoredRental(rented())).toEqual({
      rental_customer_name: "Asha Mehta",
      rental_customer_mobile: "9876543210",
      rental_customer_address: "12 MG Road",
      rental_period_start: "2026-08-01",
      rental_period_end: "2026-12-01",
      rental_price: 4000,
      rental_deposit: null,
      deposit_received_on: null,
    });
  });

  it("puts the deposit back with the day it was received", () => {
    expect(restoredRental(rented({ rental_deposit: 8000, deposit_received_on: "2026-08-01T00:00:00.000+00:00" }))).toMatchObject({
      rental_deposit: 8000,
      deposit_received_on: "2026-08-01",
    });
    expect(restoredRental(rented({ rental_deposit: 0 }))).toMatchObject({ rental_deposit: null });
  });

  it("reads the days from any shape Appwrite gave them in", () => {
    const restored = restoredRental(
      rented({
        rental_period_start: "2026-08-01T00:00:00.000+00:00",
        rental_period_end: "2026-12-01T00:00:00.000+00:00",
      })
    );

    expect(restored.rental_period_start).toBe("2026-08-01");
    expect(restored.rental_period_end).toBe("2026-12-01");
  });

  it("keeps what was missing missing", () => {
    expect(
      restoredRental(
        rented({
          rental_customer_address: undefined,
          rental_period_end: null,
          rental_price: undefined,
        })
      )
    ).toMatchObject({
      rental_customer_address: null,
      rental_period_end: null,
      rental_price: null,
    });
  });

  it("takes the deposit off the piano too, and Undo puts it back", () => {
    const original = rented({ rental_deposit: 8000, deposit_received_on: "2026-08-01" });
    const cleared = { ...original, ...clearedRental() } as any;
    expect(cleared).toMatchObject({ rental_deposit: null, deposit_received_on: null });

    expect({ ...cleared, ...restoredRental(original) }).toMatchObject({
      rental_deposit: 8000,
      deposit_received_on: "2026-08-01",
    });
  });

  it("undoes clearedRental: clearing and then restoring gives the rental back", () => {
    const original = rented();
    const cleared = { ...original, ...clearedRental() } as any;

    expect({ ...cleared, ...restoredRental(original) }).toMatchObject({
      rental_customer_name: "Asha Mehta",
      rental_period_start: "2026-08-01",
      rental_period_end: "2026-12-01",
      rental_price: 4000,
    });
  });
});

describe("the rental that is kept", () => {
  const returnedOn = new Date(2026, 8, 29);

  it("has the piano, the renter, the dates, the rent, the day it came back and why", () => {
    expect(rentalReturned(rented({ rental_period_end: "2026-09-15" }), returnedOn)).toEqual({
      pianoId: "kawai",
      pianoTitle: "Kawai K-300",
      creator: "account-1",
      customerName: "Asha Mehta",
      customerMobile: "9876543210",
      customerAddress: "12 MG Road",
      periodStart: "2026-08-01",
      periodEnd: "2026-09-15",
      price: 4000,
      deposit: null,
      depositRefunded: null,
      depositNote: null,
      closedOn: returnedOn,
      reason: "returned",
    });
  });

  it("carries the deposit that was held, not settled yet", () => {
    expect(rentalReturned(rented({ rental_deposit: 8000 }), returnedOn)).toMatchObject({
      reason: "returned",
      deposit: 8000,
      depositRefunded: null,
      depositNote: null,
    });
  });

  it("carries how the deposit was settled: what was refunded, and why part was kept", () => {
    const settlement = { held: 8000, refund: 3500, kept: 4500, forRent: 4500, forDamage: 0, note: "unpaid rent" };

    expect(rentalReturned(rented({ rental_deposit: 8000 }), returnedOn, settlement)).toMatchObject({
      deposit: 8000,
      depositRefunded: 3500,
      depositNote: "unpaid rent",
    });
  });

  it("carries a settlement of nothing refunded as 0, not as not settled", () => {
    const settlement = { held: 8000, refund: 0, kept: 8000, forRent: 0, forDamage: 0, note: null };

    expect(rentalReturned(rented({ rental_deposit: 8000 }), returnedOn, settlement)).toMatchObject({ depositRefunded: 0 });
  });

  it("ends the day it came back when that is before the agreed end", () => {
    expect(rentalReturned(rented({ rental_period_end: "2026-12-01" }), returnedOn)?.periodEnd).toBe("2026-09-29");
  });

  it("keeps the agreed end when it came back on it, or after it", () => {
    expect(rentalReturned(rented({ rental_period_end: "2026-09-29" }), returnedOn)?.periodEnd).toBe("2026-09-29");
    expect(rentalReturned(rented({ rental_period_end: "2026-07-01" }), returnedOn)?.periodEnd).toBe("2026-07-01");
  });

  it("ends the day it came back when there was no agreed end", () => {
    expect(rentalReturned(rented({ rental_period_end: null }), returnedOn)?.periodEnd).toBe("2026-09-29");
  });

  it("goes by the day it came back, which may be earlier than today", () => {
    const entry = rentalReturned(rented({ rental_period_end: "2026-12-01" }), new Date(2026, 8, 20));

    expect(entry).toMatchObject({ periodEnd: "2026-09-20", closedOn: new Date(2026, 8, 20) });
  });

  it("is nothing for a piano that had no rental on it", () => {
    expect(
      rentalReturned(
        rented({
          rental_customer_name: "",
          rental_customer_mobile: null,
          rental_customer_address: null,
          rental_period_start: null,
          rental_period_end: null,
          rental_price: null,
        }),
        returnedOn
      )
    ).toBeNull();
  });

  it("is nothing for a piano that isn't a rental", () => {
    expect(rentalReturned(rented({ category: "warehouse" }), returnedOn)).toBeNull();
  });
});

describe("what puts a deposit back", () => {
  it("is the amount and the day it was received, as they are saved", () => {
    expect(restoredDeposit(rented({ rental_deposit: 8000, deposit_received_on: "2026-08-01T00:00:00.000+00:00" }))).toEqual({
      rental_deposit: 8000,
      deposit_received_on: "2026-08-01",
    });
  });

  it("is nothing for a rental with no deposit", () => {
    expect(restoredDeposit(rented())).toEqual({ rental_deposit: null, deposit_received_on: null });
    expect(restoredDeposit(rented({ rental_deposit: 0 }))).toEqual({ rental_deposit: null, deposit_received_on: null });
  });
});

describe("the rental that is kept when a piano is sold with a deposit held", () => {
  const soldOn = new Date(2026, 8, 29);

  it("is nothing when no deposit is held, so a sale keeps its details on the piano as it always did", () => {
    expect(rentalSoldWithDeposit(rented(), soldOn)).toBeNull();
    expect(rentalSoldWithDeposit(rented({ rental_deposit: 0 }), soldOn)).toBeNull();
  });

  it("is nothing for a piano with no rental on it", () => {
    expect(
      rentalSoldWithDeposit(
        rented({ rental_deposit: 8000, rental_customer_name: null, rental_period_start: null }),
        soldOn
      )
    ).toBeNull();
  });

  it("carries the rental and its deposit, not settled, ended on the day of the sale", () => {
    expect(rentalSoldWithDeposit(rented({ rental_deposit: 8000 }), soldOn)).toEqual({
      pianoId: "kawai",
      pianoTitle: "Kawai K-300",
      creator: "account-1",
      customerName: "Asha Mehta",
      customerMobile: "9876543210",
      customerAddress: "12 MG Road",
      periodStart: "2026-08-01",
      periodEnd: "2026-09-29",
      price: 4000,
      deposit: 8000,
      depositRefunded: null,
      depositNote: null,
      closedOn: soldOn,
      reason: "ended",
    });
  });

  it("ends on the agreed end when that was before the sale", () => {
    expect(
      rentalSoldWithDeposit(rented({ rental_deposit: 8000, rental_period_end: "2026-09-10" }), soldOn)?.periodEnd
    ).toBe("2026-09-10");
  });
});
