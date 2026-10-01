import {
  buildCustomers,
  pastRentalDetail,
  pastRentals,
  rangeText,
} from "@/utils/customers";
import { makePiano } from "./helpers/fixtures";

/**
 * The rentals that were kept, put with the customers and with a piano's
 * payments. Today is 29 September 2026.
 */

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const kawai = makePiano({
  $id: "kawai",
  title: "Kawai K-300",
  category: "rentable",
  rental_customer_name: "Asha Mehta",
  rental_customer_mobile: "9876543210",
  rental_period_start: "2026-08-01" as any,
  rental_period_end: "2026-12-01" as any,
  rental_price: 4000,
});

let counter = 0;
const pay = (
  pianoId: string,
  paidOn: string,
  amount: number,
  customer: string | null
) => ({
  $id: `p-${++counter}`,
  $createdAt: `${paidOn}T09:00:00.000+00:00`,
  piano_id: pianoId,
  creator: "account-1",
  amount,
  paid_on: paidOn,
  customer_name: customer,
});

const kept = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    $id: id,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: "kawai",
    creator: "account-1",
    customer_name: "Ravi Kumar",
    period_start: "2026-02-01",
    period_end: "2026-05-31",
    price: 3500,
    closed_on: "2026-06-01",
    reason: "replaced",
    ...extra,
  }) as any;

describe("customers with kept rentals", () => {
  it("include someone who only appears in a kept rental, with the piano from it", () => {
    const { customers } = buildCustomers(
      [],
      [],
      [
        kept("h1", {
          customer_name: "Priya Nair",
          piano_title: "Yamaha U1",
          piano_id: "gone",
        }),
      ]
    );

    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      name: "Priya Nair",
      paymentsCount: 0,
      total: 0,
      renting: false,
    });
    expect(customers[0].pianos).toEqual([
      expect.objectContaining({ title: "Yamaha U1", paymentsCount: 0 }),
    ]);
    expect(customers[0].rentals).toHaveLength(1);
  });

  it("put a kept rental with the same person, whatever the capitals, the newest first", () => {
    const { customers } = buildCustomers(
      [pay("kawai", "2026-05-02", 3500, "Ravi Kumar")],
      [kawai],
      [
        kept("old", { customer_name: "ravi  kumar", closed_on: "2025-01-02" }),
        kept("new", { closed_on: "2026-06-01" }),
      ]
    );

    const ravi = customers.find((customer) => customer.key === "ravi kumar")!;
    expect(ravi.rentals.map((rental) => rental.$id)).toEqual(["new", "old"]);
    expect(ravi.paymentsCount).toBe(1);
  });

  it("leave out a kept rental with no name", () => {
    const { customers } = buildCustomers(
      [],
      [],
      [kept("h1", { customer_name: "" })]
    );

    expect(customers).toEqual([]);
  });
});

describe("the rentals a piano has had", () => {
  it("are the kept ones, the one that ended last first, with the payments made in each", () => {
    const rentals = pastRentals(
      [
        pay("kawai", "2026-03-02", 3500, "Ravi Kumar"),
        pay("kawai", "2026-05-02", 3500, "Ravi Kumar"),
        pay("kawai", "2025-11-02", 3000, "Meera Kapoor"),
      ],
      [
        kept("meera", {
          customer_name: "Meera Kapoor",
          period_start: "2025-10-01",
          period_end: "2025-12-31",
          closed_on: "2026-01-02",
          price: 3000,
        }),
        kept("ravi"),
      ],
      kawai
    );

    expect(rentals.map((rental) => rental.name)).toEqual([
      "Ravi Kumar",
      "Meera Kapoor",
    ]);
    expect(rentals[0]).toMatchObject({
      fromHistory: true,
      paymentsCount: 2,
      total: 7000,
      price: 3500,
    });
    expect(rentals[0].startOn).toEqual(new Date(2026, 1, 1));
    expect(rentals[0].endOn).toEqual(new Date(2026, 4, 31));
    expect(rentals[1]).toMatchObject({ paymentsCount: 1, total: 3000 });
  });

  it("don't count one payment in two rentals of the same person", () => {
    const rentals = pastRentals(
      [pay("kawai", "2026-02-20", 100, "Ravi Kumar")],
      [
        kept("first", {
          period_start: "2026-01-01",
          period_end: "2026-02-28",
          closed_on: "2026-03-01",
        }),
        kept("second", {
          period_start: "2026-02-10",
          period_end: "2026-05-31",
          closed_on: "2026-06-01",
        }),
      ],
      kawai
    );

    expect(rentals.reduce((sum, rental) => sum + rental.paymentsCount, 0)).toBe(
      1
    );
  });

  it("add the people who only paid, after the kept ones, and not the one who has it now", () => {
    const rentals = pastRentals(
      [
        pay("kawai", "2024-04-02", 800, "Priya Nair"),
        pay("kawai", "2026-09-02", 4000, "Asha Mehta"),
        pay("kawai", "2026-04-02", 100, null),
      ],
      [kept("ravi")],
      kawai
    );

    expect(rentals.map((rental) => [rental.name, rental.fromHistory])).toEqual([
      ["Ravi Kumar", true],
      ["Priya Nair", false],
    ]);
  });

  it("leave out the kept rentals of other pianos", () => {
    expect(pastRentals([], [kept("h1", { piano_id: "weber" })], kawai)).toEqual(
      []
    );
  });

  it("call a kept rental with no name Someone, with no customer to open", () => {
    const [rental] = pastRentals(
      [],
      [kept("h1", { customer_name: null })],
      kawai
    );

    expect(rental).toMatchObject({ name: "Someone", key: "" });
  });

  it("have no start for a kept rental that has none, and use the day it closed for the end", () => {
    const [rental] = pastRentals(
      [],
      [kept("h1", { period_start: null, period_end: null })],
      kawai
    );

    expect(rental.startOn).toBeNull();
    expect(rental.endOn).toEqual(new Date(2026, 5, 1));
  });
});

describe("the words for rentals", () => {
  it("give the dates", () => {
    expect(rangeText(new Date(2026, 1, 1), new Date(2026, 4, 31))).toBe(
      "1 Feb 2026 to 31 May 2026"
    );
    expect(rangeText(new Date(2026, 1, 1), null)).toBe("From 1 Feb 2026");
    expect(rangeText(null, new Date(2026, 4, 31))).toBe("Until 31 May 2026");
    expect(rangeText(null, null)).toBe("");
  });

  it("describe a kept rental by its dates, rent and payments, the others by their payments", () => {
    const [keptOne, onlyPaid] = pastRentals(
      [
        pay("kawai", "2026-03-02", 3500, "Ravi Kumar"),
        pay("kawai", "2024-04-02", 800, "Priya Nair"),
      ],
      [kept("ravi")],
      kawai
    );

    expect(pastRentalDetail(keptOne)).toBe(
      "1 Feb 2026 to 31 May 2026 · ₹3,500 rent · 1 payment"
    );
    expect(pastRentalDetail(onlyPaid)).toBe("1 payment · Apr 2024");
  });
});
