import { isMissingTable } from "@/lib/appwrite";
import { rentalToArchive } from "@/utils/rentalHistory";
import { makePiano } from "./helpers/fixtures";

/**
 * When a piano's rental is over and should be kept before the next one writes
 * over it. Today is 29 September 2026.
 */

const today = new Date(2026, 8, 29);

const rented = (extra = {}) =>
  makePiano({
    $id: "kawai",
    title: "Kawai K-300",
    category: "rentable",
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "9876543210",
    rental_customer_address: "12 MG Road",
    rental_period_start: "2026-01-12" as any,
    rental_period_end: "2026-04-12" as any,
    rental_price: 4000,
    ...extra,
  });

describe("an old rental is kept when", () => {
  it("the piano is rented to someone else with a new start date", () => {
    const entry = rentalToArchive(
      rented(),
      rented({
        rental_customer_name: "Ravi Kumar",
        rental_period_start: "2026-05-01",
        rental_period_end: "2026-08-01",
      }),
      today
    );

    expect(entry).toEqual({
      pianoId: "kawai",
      pianoTitle: "Kawai K-300",
      creator: expect.any(String),
      customerName: "Asha Mehta",
      customerMobile: "9876543210",
      customerAddress: "12 MG Road",
      periodStart: "2026-01-12",
      periodEnd: "2026-04-12",
      price: 4000,
      closedOn: today,
      reason: "replaced",
    });
  });

  it("the same person starts a new period", () => {
    const entry = rentalToArchive(
      rented(),
      rented({
        rental_period_start: "2026-06-01",
        rental_period_end: "2026-09-01",
      }),
      today
    );

    expect(entry?.reason).toBe("replaced");
    expect(entry?.periodStart).toBe("2026-01-12");
  });

  it("the customer is taken off the rental", () => {
    const entry = rentalToArchive(
      rented(),
      rented({
        rental_customer_name: "",
        rental_customer_mobile: "",
        rental_customer_address: "",
      }),
      today
    );

    expect(entry?.reason).toBe("ended");
    expect(entry?.customerName).toBe("Asha Mehta");
  });

  it("the piano stops being a rental", () => {
    const entry = rentalToArchive(
      rented(),
      rented({
        category: "warehouse",
        rental_customer_name: null,
        rental_customer_mobile: null,
        rental_customer_address: null,
      }),
      today
    );

    expect(entry?.reason).toBe("ended");
    expect(entry?.periodEnd).toBe("2026-04-12");
  });

  it("there was no start date and the customer is someone else", () => {
    const entry = rentalToArchive(
      rented({ rental_period_start: null }),
      rented({ rental_period_start: null, rental_customer_name: "Ravi Kumar" }),
      today
    );

    expect(entry?.reason).toBe("replaced");
    expect(entry?.periodStart).toBeNull();
  });

  it("keeps a missing price as nothing, not zero", () => {
    const entry = rentalToArchive(
      rented({ rental_price: null }),
      rented({ rental_period_start: "2026-06-01", rental_price: null }),
      today
    );

    expect(entry?.price).toBeNull();
  });
});

describe("nothing is kept when the same rental only changes", () => {
  it("it is extended", () => {
    expect(
      rentalToArchive(
        rented(),
        rented({ rental_period_end: "2026-09-12" }),
        today
      )
    ).toBeNull();
  });

  it("it is shortened", () => {
    expect(
      rentalToArchive(
        rented(),
        rented({ rental_period_end: "2026-03-01" }),
        today
      )
    ).toBeNull();
  });

  it("the price, the number or the address changes", () => {
    expect(
      rentalToArchive(
        rented(),
        rented({
          rental_price: 4500,
          rental_customer_mobile: "9000000000",
          rental_customer_address: "5 Park St",
        }),
        today
      )
    ).toBeNull();
  });

  it("a name is corrected, with the same start date", () => {
    expect(
      rentalToArchive(
        rented(),
        rented({ rental_customer_name: "Asha Mehata" }),
        today
      )
    ).toBeNull();
  });

  it("nothing changes about the rental", () => {
    expect(
      rentalToArchive(
        rented(),
        rented({ title: "Kawai K-300 (restored)" }),
        today
      )
    ).toBeNull();
  });

  it("the start date is the same day, written differently", () => {
    expect(
      rentalToArchive(
        rented(),
        rented({ rental_period_start: "2026-01-12T00:00:00.000+00:00" }),
        today
      )
    ).toBeNull();
  });
});

describe("nothing is kept when there was no rental to keep", () => {
  it("the piano wasn't a rental", () => {
    const before = makePiano({
      $id: "w",
      category: "warehouse",
      rental_customer_name: "Old Name",
    });

    expect(rentalToArchive(before, rented({ $id: "w" }), today)).toBeNull();
  });

  it("it was a rental with no customer and no start date", () => {
    const blank = rented({
      rental_customer_name: "",
      rental_period_start: null,
    });

    expect(
      rentalToArchive(
        blank,
        rented({ rental_period_start: "2026-06-01" }),
        today
      )
    ).toBeNull();
  });

  it("a rental is only being set up: a customer is added to a blank one", () => {
    const blank = rented({
      rental_customer_name: "",
      rental_period_start: null,
      rental_period_end: null,
    });

    expect(rentalToArchive(blank, rented(), today)).toBeNull();
  });
});

describe("a missing table", () => {
  it("is told from the message Appwrite gives", () => {
    expect(
      isMissingTable(
        new Error("Collection with the requested ID could not be found.")
      )
    ).toBe(true);
    expect(isMissingTable({ message: "x", type: "collection_not_found" })).toBe(
      true
    );
  });

  it("isn't mistaken for another failure", () => {
    expect(isMissingTable(new Error("Network request failed"))).toBe(false);
    expect(
      isMissingTable(
        new Error("Document with the requested ID could not be found.")
      )
    ).toBe(false);
    expect(isMissingTable(undefined)).toBe(false);
  });
});
