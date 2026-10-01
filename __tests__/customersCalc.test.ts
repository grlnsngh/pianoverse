import {
  buildCustomers,
  customerKey,
  customerLine,
  pastRenters,
  paymentsOfCustomer,
  paymentsText,
  periodText,
} from "@/utils/customers";
import { makePiano } from "./helpers/fixtures";

/**
 * Who has rented what, from the names saved with the payments and the
 * customers on the pianos rented out now. Today is 29 September 2026.
 */

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const rental = (
  id: string,
  title: string,
  customer: string | null,
  end: string,
  extra = {}
) =>
  makePiano({
    $id: id,
    title,
    category: "rentable",
    rental_customer_name: customer,
    rental_customer_mobile: "9876543210",
    rental_period_start: "2026-01-01" as any,
    rental_period_end: end as any,
    rental_price: 4000,
    ...extra,
  });

let counter = 0;
const pay = (
  pianoId: string,
  paidOn: string,
  amount: number,
  customer: string | null | undefined,
  note?: string
) => ({
  $id: `p-${++counter}`,
  $createdAt: `${paidOn}T09:00:00.000+00:00`,
  piano_id: pianoId,
  creator: "account-1",
  amount,
  paid_on: paidOn,
  note,
  customer_name: customer,
});

const kawai = rental("kawai", "Kawai K-300", "Asha Mehta", "2026-12-01");
const yamaha = rental("yamaha", "Yamaha U1", "Ravi Kumar", "2026-08-20"); // ended, not taken back
const weber = rental("weber", "Weber W-121", "Asha Mehta", "2026-11-15");
const soldOne = rental("sold", "Estonia 190", "Meera Kapoor", "2026-12-01", {
  sold_date: "2026-09-10" as any,
});
const stock = makePiano({
  $id: "stock",
  title: "Ronish R-112",
  category: "warehouse",
  rental_customer_name: "Old Name",
});

describe("a customer's key", () => {
  it("is the name in lower case with one space between words, and empty for no name", () => {
    expect(customerKey("  Asha   Mehta ")).toBe("asha mehta");
    expect(customerKey("ASHA MEHTA")).toBe("asha mehta");
    expect(customerKey("")).toBe("");
    expect(customerKey("   ")).toBe("");
    expect(customerKey(null)).toBe("");
    expect(customerKey(undefined)).toBe("");
  });
});

describe("the customers", () => {
  it("are the names saved with the payments, the same name in other capitals being one person", () => {
    const { customers } = buildCustomers(
      [
        pay("kawai", "2026-09-02", 4000, "Asha Mehta"),
        pay("kawai", "2026-08-02", 4000, "asha  mehta"),
        pay("yamaha", "2026-08-05", 3000, "Ravi Kumar"),
      ],
      [kawai, yamaha]
    );

    expect(customers.map((customer) => customer.key).sort()).toEqual([
      "asha mehta",
      "ravi kumar",
    ]);
    const asha = customers.find((customer) => customer.key === "asha mehta")!;
    expect(asha).toMatchObject({ paymentsCount: 2, total: 8000 });
  });

  it("show the name as it was written the last time", () => {
    const { customers } = buildCustomers(
      [
        pay("kawai", "2026-07-02", 4000, "asha mehta"),
        pay("kawai", "2026-09-02", 4000, "Asha  Mehta"),
      ],
      [kawai]
    );

    expect(customers[0].name).toBe("Asha Mehta");
  });

  it("add up what each paid, piano by piano, and know the last day they paid", () => {
    const { customers } = buildCustomers(
      [
        pay("kawai", "2026-09-02", 4000, "Asha Mehta"),
        pay("kawai", "2026-08-02", 4000, "Asha Mehta"),
        pay("weber", "2026-06-10", 2500, "Asha Mehta"),
      ],
      [kawai, weber]
    );
    const [asha] = customers;

    expect(asha).toMatchObject({ paymentsCount: 3, total: 10500 });
    expect(asha.lastPaidOn).toEqual(new Date(2026, 8, 2));
    expect(
      asha.pianos.map((entry) => [
        entry.title,
        entry.paymentsCount,
        entry.total,
      ])
    ).toEqual([
      ["Kawai K-300", 2, 8000],
      ["Weber W-121", 1, 2500],
    ]);
  });

  it("include someone who has a piano now but hasn't paid yet", () => {
    const { customers } = buildCustomers([], [kawai]);

    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      name: "Asha Mehta",
      renting: true,
      paymentsCount: 0,
      total: 0,
      lastPaidOn: null,
      mobile: "9876543210",
    });
    expect(customers[0].pianos).toEqual([
      expect.objectContaining({
        pianoId: "kawai",
        renting: true,
        paymentsCount: 0,
      }),
    ]);
  });

  it("count a rental that has ended but hasn't been taken back as still theirs", () => {
    const { customers } = buildCustomers([], [yamaha]);

    expect(customers[0]).toMatchObject({ name: "Ravi Kumar", renting: true });
  });

  it("don't count a sold piano, or one that isn't a rental, as being rented", () => {
    const { customers } = buildCustomers([], [soldOne, stock]);

    expect(customers).toEqual([]);
  });

  it("put the pianos someone has now before the ones they had", () => {
    const { customers } = buildCustomers(
      [
        pay("weber", "2026-09-20", 2500, "Asha Mehta"),
        pay("kawai", "2026-05-02", 4000, "Asha Mehta"),
      ],
      [
        kawai,
        makePiano({
          $id: "weber",
          title: "Weber W-121",
          category: "warehouse",
        }),
      ]
    );

    expect(
      customers[0].pianos.map((entry) => [entry.title, entry.renting])
    ).toEqual([
      ["Kawai K-300", true],
      ["Weber W-121", false],
    ]);
  });

  it("list the ones who have a piano now first, then the rest by when they last paid", () => {
    const { customers } = buildCustomers(
      [
        pay("old", "2026-01-05", 1000, "Early Bird"),
        pay("old", "2026-07-05", 1000, "Later Payer"),
        pay("kawai", "2026-02-01", 4000, "Asha Mehta"),
      ],
      [kawai]
    );

    expect(customers.map((customer) => customer.name)).toEqual([
      "Asha Mehta",
      "Later Payer",
      "Early Bird",
    ]);
  });

  it("count the payments recorded before names were saved, and leave them out", () => {
    const { customers, unnamed } = buildCustomers(
      [
        pay("kawai", "2026-09-02", 4000, null),
        pay("kawai", "2026-08-02", 4000, undefined),
        pay("kawai", "2026-07-02", 4000, "  "),
      ],
      [kawai]
    );

    expect(unnamed).toBe(3);
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      name: "Asha Mehta",
      paymentsCount: 0,
    });
  });

  it('call a piano that isn\'t in the list just "A piano"', () => {
    const { customers } = buildCustomers(
      [pay("gone", "2026-09-02", 4000, "Asha Mehta")],
      []
    );

    expect(customers[0].pianos[0].title).toBe("A piano");
  });
});

describe("the previous renters of a piano", () => {
  const payments = [
    pay("kawai", "2026-09-02", 4000, "Asha Mehta"),
    pay("kawai", "2026-05-02", 3500, "Ravi Kumar"),
    pay("kawai", "2026-03-02", 3500, "Ravi Kumar"),
    pay("kawai", "2025-12-02", 3000, "Meera Kapoor"),
    pay("weber", "2026-09-02", 9999, "Someone Else"),
    pay("kawai", "2026-04-02", 100, null),
  ];

  it("are everyone but whoever has it now, the one who paid last first", () => {
    const renters = pastRenters(payments, kawai);

    expect(renters.map((renter) => renter.name)).toEqual([
      "Ravi Kumar",
      "Meera Kapoor",
    ]);
    expect(renters[0]).toMatchObject({ paymentsCount: 2, total: 7000 });
    expect(renters[0].firstPaidOn).toEqual(new Date(2026, 2, 2));
    expect(renters[0].lastPaidOn).toEqual(new Date(2026, 4, 2));
  });

  it("are everyone who paid, once the piano is sold or no longer rented out", () => {
    const sold = { ...kawai, sold_date: "2026-09-10" } as any;
    const notRented = { ...kawai, category: "warehouse" } as any;

    expect(pastRenters(payments, sold).map((renter) => renter.name)).toEqual([
      "Asha Mehta",
      "Ravi Kumar",
      "Meera Kapoor",
    ]);
    expect(pastRenters(payments, notRented)).toHaveLength(3);
  });

  it("leave out payments with no name, and the payments of other pianos", () => {
    const names = pastRenters(payments, kawai).map((renter) => renter.name);

    expect(names).not.toContain("Someone Else");
    expect(pastRenters([pay("kawai", "2026-04-02", 100, null)], kawai)).toEqual(
      []
    );
  });

  it("are nobody when only the current renter has paid", () => {
    expect(
      pastRenters([pay("kawai", "2026-09-02", 4000, "asha mehta")], kawai)
    ).toEqual([]);
  });
});

describe("one customer's payments", () => {
  it("are theirs only, newest first", () => {
    const payments = [
      pay("kawai", "2026-06-02", 1, "Asha Mehta"),
      pay("kawai", "2026-09-02", 2, "ASHA MEHTA"),
      pay("kawai", "2026-08-02", 3, "Ravi Kumar"),
    ];

    expect(
      paymentsOfCustomer(payments, "asha mehta").map(
        (payment) => payment.amount
      )
    ).toEqual([2, 1]);
  });
});

describe("the words", () => {
  it("say how many payments, in the singular too", () => {
    expect(paymentsText(1)).toBe("1 payment");
    expect(paymentsText(3)).toBe("3 payments");
  });

  it("say which months", () => {
    expect(periodText(new Date(2026, 2, 2), new Date(2026, 4, 2))).toBe(
      "Mar 2026 to May 2026"
    );
    expect(periodText(new Date(2026, 2, 2), new Date(2026, 2, 20))).toBe(
      "Mar 2026"
    );
    expect(periodText(null, null)).toBe("");
  });

  it("describe a customer in the list by their pianos and payments", () => {
    const { customers } = buildCustomers(
      [
        pay("kawai", "2026-09-02", 4000, "Asha Mehta"),
        pay("kawai", "2026-08-02", 4000, "Asha Mehta"),
      ],
      [kawai]
    );

    expect(customerLine(customers[0])).toBe("Kawai K-300 · 2 payments");
  });

  it("name two pianos, and count the rest", () => {
    const pianos = ["a", "b", "c", "d"].map((id) =>
      makePiano({
        $id: id,
        title: `Piano ${id.toUpperCase()}`,
        category: "warehouse",
      })
    );
    const payments = pianos.map((piano, index) =>
      pay(piano.$id, `2026-0${index + 1}-02`, 100, "Asha Mehta")
    );
    const { customers } = buildCustomers(payments, pianos);

    expect(customerLine(customers[0])).toBe(
      "Piano D, Piano C and 2 more · 4 payments"
    );
  });

  it("say so when a customer hasn't paid yet", () => {
    expect(customerLine(buildCustomers([], [kawai]).customers[0])).toBe(
      "Kawai K-300 · No payments yet"
    );
  });
});
