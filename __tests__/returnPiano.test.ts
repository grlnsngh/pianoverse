import { needsAttention, rentedOut, stockCounts } from "@/utils/today";
import { rentalReturned } from "@/utils/rentalHistory";
import { clearedRental, hasRentalToReturn, restoredRental } from "@/utils/returnPiano";
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
    });
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
      closedOn: returnedOn,
      reason: "returned",
    });
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
