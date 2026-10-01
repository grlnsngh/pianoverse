import type { RentPayment } from "@/lib/appwrite";
import type { Customer } from "@/utils/customers";
import { asText, convertCustomersToCSV, convertPaymentsToCSV } from "@/utils/ledgerCsv";
import { makePiano } from "./helpers/fixtures";

/** The payments and customers as CSV, for a spreadsheet or an accountant. */

/** The CSV as rows of fields, reading quoted fields the way spreadsheets do. */
const parse = (csv: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  rows.push(row);
  return rows;
};

const kawai = makePiano({ $id: "kawai", title: "Kawai K-300" });
const weber = makePiano({ $id: "weber", title: "Weber W-121" });

let counter = 0;
const payment = (extra: Partial<RentPayment> = {}): RentPayment => ({
  $id: `p-${++counter}`,
  $createdAt: "2026-09-04T09:00:00.000+00:00",
  piano_id: "kawai",
  creator: "account-1",
  amount: 4000,
  paid_on: "2026-09-03",
  note: null,
  customer_name: "Asha Mehta",
  ...extra,
});

describe("the payments as CSV", () => {
  it("has a header, then a line for each payment", () => {
    const rows = parse(convertPaymentsToCSV([payment(), payment({ amount: 5000 })], [kawai]));

    expect(rows[0]).toEqual(["Date paid", "Customer", "Piano", "Amount", "Note", "Recorded on"]);
    expect(rows).toHaveLength(3);
  });

  it("has the day paid, who paid, the piano, the amount, the note and the day it was recorded", () => {
    const [, row] = parse(
      convertPaymentsToCSV([payment({ note: "UPI", $createdAt: new Date(2026, 8, 5, 18, 30).toISOString() })], [kawai])
    );

    expect(row).toEqual(["2026-09-03", "Asha Mehta", "Kawai K-300", "4000", "UPI", "2026-09-05"]);
  });

  it("is oldest first, whatever order it was given in, and by when it was recorded for the same day", () => {
    const rows = parse(
      convertPaymentsToCSV(
        [
          payment({ $id: "c", paid_on: "2026-09-20", amount: 3 }),
          payment({ $id: "a", paid_on: "2026-08-05", amount: 1 }),
          payment({ $id: "b2", paid_on: "2026-09-02", amount: 22, $createdAt: "2026-09-02T12:00:00.000+00:00" }),
          payment({ $id: "b1", paid_on: "2026-09-02", amount: 21, $createdAt: "2026-09-02T08:00:00.000+00:00" }),
        ],
        [kawai]
      )
    ).slice(1);

    expect(rows.map((row) => row[3])).toEqual(["1", "21", "22", "3"]);
  });

  it("has the amount as a bare number, so a spreadsheet can add them up", () => {
    const rows = parse(
      convertPaymentsToCSV(
        [payment({ amount: 125000 }), payment({ amount: 4500.5 }), payment({ amount: 0.5 })],
        [kawai]
      )
    ).slice(1);

    expect(rows.map((row) => row[3]).sort()).toEqual(["0.5", "125000", "4500.5"].sort());
    for (const row of rows) expect(row[3]).not.toMatch(/[₹,]/);
  });

  it("has the days as yyyy-MM-dd, whatever shape Appwrite gave them in", () => {
    const [, row] = parse(
      convertPaymentsToCSV(
        [payment({ paid_on: "2026-09-03T00:00:00.000+00:00", $createdAt: "2026-09-04T00:00:00.000+00:00" })],
        [kawai]
      )
    );

    expect([row[0], row[5]]).toEqual(["2026-09-03", "2026-09-04"]);
  });

  it("names each payment's piano, and leaves it blank for one that isn't in the list", () => {
    const rows = parse(
      convertPaymentsToCSV([payment(), payment({ piano_id: "weber" }), payment({ piano_id: "gone" })], [kawai, weber])
    ).slice(1);

    expect(rows.map((row) => row[2])).toEqual(["Kawai K-300", "Weber W-121", ""]);
  });

  it("leaves the customer blank for a payment recorded before names were saved", () => {
    const rows = parse(
      convertPaymentsToCSV([payment({ customer_name: null }), payment({ customer_name: undefined }), payment({ customer_name: "  " })], [kawai])
    ).slice(1);

    expect(rows.map((row) => row[1])).toEqual(["", "", ""]);
  });

  it("quotes a note with commas, quotes or lines in it, so it stays one field", () => {
    const [, row] = parse(
      convertPaymentsToCSV([payment({ note: 'Cash, "part" payment\nbalance next month' })], [kawai])
    );

    expect(row).toHaveLength(6);
    expect(row[4]).toBe('Cash, "part" payment\nbalance next month');
  });

  it("keeps names that aren't English", () => {
    const [, row] = parse(convertPaymentsToCSV([payment({ customer_name: "आशा मेहता" })], [kawai]));

    expect(row[1]).toBe("आशा मेहता");
  });

  it("is only the header when there are no payments", () => {
    expect(convertPaymentsToCSV([], [kawai])).toBe("Date paid,Customer,Piano,Amount,Note,Recorded on");
  });

  it("doesn't change the payments it is given", () => {
    const given = [payment({ paid_on: "2026-09-20" }), payment({ paid_on: "2026-08-05" })];

    convertPaymentsToCSV(given, [kawai]);

    expect(given.map((item) => item.paid_on)).toEqual(["2026-09-20", "2026-08-05"]);
  });
});

describe("text a spreadsheet could read as a formula", () => {
  it("gets a ' in front when it starts with = or @", () => {
    expect(asText("=HYPERLINK(\"http://x\")")).toBe("'=HYPERLINK(\"http://x\")");
    expect(asText("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("gets one when it starts with a + or - that isn't the start of a number", () => {
    expect(asText("-cmd|' /C calc'!A0")).toBe("'-cmd|' /C calc'!A0");
    expect(asText("+cmd")).toBe("'+cmd");
  });

  it("is left alone when it is a phone number or a number, or ordinary text", () => {
    expect(asText("+91 98765 43210")).toBe("+91 98765 43210");
    expect(asText("-500")).toBe("-500");
    expect(asText("+.5")).toBe("+.5");
    expect(asText("Asha Mehta")).toBe("Asha Mehta");
    expect(asText("Weber W-121")).toBe("Weber W-121");
    expect(asText("a=b")).toBe("a=b");
  });

  it("is checked after the spaces at the ends are taken off, and is empty for nothing", () => {
    expect(asText("  =1+1 ")).toBe("'=1+1");
    expect(asText("  Asha ")).toBe("Asha");
    expect(asText("")).toBe("");
    expect(asText(null)).toBe("");
    expect(asText(undefined)).toBe("");
  });

  it("is applied to the customer, the piano and the note in the payments", () => {
    const [, row] = parse(
      convertPaymentsToCSV(
        [payment({ customer_name: "=A1", note: "@x" })],
        [makePiano({ $id: "kawai", title: "=B2" })]
      )
    );

    expect([row[1], row[2], row[4]]).toEqual(["'=A1", "'=B2", "'@x"]);
  });
});

const customer = (extra: Partial<Customer> = {}): Customer => ({
  key: "asha mehta",
  name: "Asha Mehta",
  pianos: [
    { pianoId: "kawai", title: "Kawai K-300", paymentsCount: 3, total: 12000, lastPaidOn: "2026-09-03", renting: true },
  ],
  paymentsCount: 3,
  total: 12000,
  lastPaidOn: new Date(2026, 8, 3),
  mobile: "9876543210",
  renting: true,
  rentals: [],
  ...extra,
});

describe("the customers as CSV", () => {
  it("has a header, then a line for each customer", () => {
    const rows = parse(convertCustomersToCSV([customer(), customer({ name: "Ravi Kumar" })]));

    expect(rows[0]).toEqual([
      "Customer",
      "Mobile",
      "Renting now",
      "Pianos",
      "Payments",
      "Total paid",
      "Last payment",
      "Earlier rentals",
    ]);
    expect(rows).toHaveLength(3);
  });

  it("has the name, number, whether they have a piano, their pianos, payments, total, last day and earlier rentals", () => {
    const [, row] = parse(convertCustomersToCSV([customer({ rentals: [{} as any, {} as any] })]));

    expect(row).toEqual(["Asha Mehta", "9876543210", "Yes", "Kawai K-300", "3", "12000", "2026-09-03", "2"]);
  });

  it("says No for someone who doesn't have a piano now", () => {
    const [, row] = parse(convertCustomersToCSV([customer({ renting: false })]));

    expect(row[2]).toBe("No");
  });

  it("lists every piano they paid for or have, separated by semicolons", () => {
    const [, row] = parse(
      convertCustomersToCSV([
        customer({
          pianos: [
            { pianoId: "a", title: "Kawai K-300", paymentsCount: 1, total: 1, lastPaidOn: null, renting: true },
            { pianoId: "b", title: "Weber W-121", paymentsCount: 1, total: 1, lastPaidOn: null, renting: false },
          ],
        }),
      ])
    );

    expect(row[3]).toBe("Kawai K-300; Weber W-121");
  });

  it("leaves the number and the last payment blank for someone who has none", () => {
    const [, row] = parse(
      convertCustomersToCSV([customer({ mobile: null, lastPaidOn: null, paymentsCount: 0, total: 0, pianos: [] })])
    );

    expect(row).toEqual(["Asha Mehta", "", "Yes", "", "0", "0", "", "0"]);
  });

  it("is in the order it was given, which is the Customers screen's", () => {
    const rows = parse(
      convertCustomersToCSV([customer({ name: "Zed Zee" }), customer({ name: "Abe Ant" })])
    ).slice(1);

    expect(rows.map((row) => row[0])).toEqual(["Zed Zee", "Abe Ant"]);
  });

  it("keeps a phone number that starts with +, and guards a name that starts with =", () => {
    const [, row] = parse(convertCustomersToCSV([customer({ mobile: "+91 98765 43210", name: "=1+1" })]));

    expect(row[0]).toBe("'=1+1");
    expect(row[1]).toBe("+91 98765 43210");
  });

  it("is only the header when there are no customers", () => {
    expect(convertCustomersToCSV([])).toBe(
      "Customer,Mobile,Renting now,Pianos,Payments,Total paid,Last payment,Earlier rentals"
    );
  });
});
