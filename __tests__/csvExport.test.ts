import { addDays } from "date-fns";
import { PianoItem } from "@/redux/pianos/types";
import { convertPianosToCSV } from "@/utils/csvExport";
import { toStoredDate } from "@/utils/dates";
import { makePiano } from "./helpers/fixtures";

const inDays = (days: number) => toStoredDate(addDays(new Date(), days)) as any;

/** The CSV as rows of fields, reading quoted fields the way spreadsheets do. */
const parse = (csv: string) =>
  csv.split("\n").map((line) => {
    const fields: string[] = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (quoted) {
        if (char === '"' && line[i + 1] === '"') {
          field += '"';
          i++;
        } else if (char === '"') quoted = false;
        else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") {
        fields.push(field);
        field = "";
      } else field += char;
    }
    fields.push(field);
    return fields;
  });

/** Each piano's row as { header: value }. */
const exportOf = (pianos: PianoItem[]) => {
  const [headers, ...rows] = parse(convertPianosToCSV(pianos));
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, i) => [header, row[i]]))
  );
};

const rental = makePiano({
  $id: "rental",
  category: "rentable",
  rental_customer_name: "Asha Mehta",
  rental_period_start: inDays(-30),
  rental_period_end: inDays(30),
  rental_price: 4000,
});

describe("the CSV export", () => {
  // Batch 52 (SEC2): a spreadsheet runs a field that starts with = + - or @ as a formula
  describe("text typed by a person that a spreadsheet would run as a formula", () => {
    const FORMULA = '=HYPERLINK("http://example.com","click")';

    it("is shown as the text it is, in every field a person types", () => {
      const [row] = exportOf([
        makePiano({
          category: "rentable",
          title: FORMULA,
          make: "@SUM(1+1)",
          company_associated: "-2+3",
          description: "+cmd|' /C calc'!A0",
          rental_customer_name: "=1+1",
          rental_customer_mobile: "@evil",
          rental_customer_address: "-cmd",
          rental_period_start: inDays(-30),
          rental_period_end: inDays(30),
          rental_price: 4000,
        }),
      ]);

      expect(row["Piano Name"]).toBe(`'${FORMULA}`);
      expect(row["Brand/Make"]).toBe("'@SUM(1+1)");
      expect(row["Company/Owner"]).toBe("'-2+3");
      expect(row["Notes/Description"]).toBe("'+cmd|' /C calc'!A0");
      expect(row["Rental Customer Name"]).toBe("'=1+1");
      expect(row["Customer Phone"]).toBe("'@evil");
      expect(row["Customer Address"]).toBe("'-cmd");
    });

    it("is shown as the text it is for an event piano, a piano on sale and a piano sold", () => {
      const [event, onSale, sold] = exportOf([
        makePiano({ category: "events", event_purchase_from: "=A1", event_model_number: "+B2", event_b_number: "@C3" }),
        makePiano({ category: "on_sale", on_sale_purchase_from: "=D4" }),
        makePiano({ category: "on_sale", sold_date: inDays(-3), sold_price: 50000, sold_to_name: "=E5", sold_to_address: "-F6x" }),
      ]);

      expect(event["Purchased From (Event)"]).toBe("'=A1");
      expect(event["Model Number"]).toBe("'+B2");
      expect(event["B Number"]).toBe("'@C3");
      expect(onSale["Purchased From (Sale)"]).toBe("'=D4");
      expect(sold["Buyer"]).toBe("'=E5");
      expect(sold["Buyer Address"]).toBe("'-F6x");
    });

    it("leaves a phone number with a plus, ordinary names and the numbers the app works out as they were", () => {
      const [row] = exportOf([
        makePiano({
          ...rental,
          title: "Weber W-121",
          rental_customer_name: "Asha Mehta",
          rental_customer_mobile: "+91 98765 43210",
          rental_customer_address: "12-B, Model Town",
          purchase_price: 62000,
        }),
      ]);

      expect(row["Piano Name"]).toBe("Weber W-121");
      expect(row["Rental Customer Name"]).toBe("Asha Mehta");
      expect(row["Customer Phone"]).toBe("+91 98765 43210");
      expect(row["Customer Address"]).toBe("12-B, Model Town");
      expect(row["Monthly Rent"]).toBe("₹4,000");
      expect(row["Bought For"]).toBe("₹62,000");
    });
  });

  it("marks a sold piano as sold, with the sale's details", () => {
    const [row] = exportOf([
      {
        ...rental,
        sold_date: "2026-09-05" as any,
        sold_price: 185000,
        sold_to_name: "Ravi Kumar",
        sold_to_address: "5 Park Street",
      },
    ]);

    expect(row).toMatchObject({
      Status: "Sold",
      "Sold On": expect.stringContaining("2026"),
      "Sold For": "₹1,85,000",
      Buyer: "Ravi Kumar",
      "Buyer Address": "5 Park Street",
    });
    // The rental is over, so it isn't running or due
    expect(row["Rental Status"]).toBe("");
    expect(row["Days Until Due"]).toBe("");
    // Its history is still there
    expect(row["Rental Customer Name"]).toBe("Asha Mehta");
  });

  it("leaves the sale columns empty for a piano in stock", () => {
    const [row] = exportOf([rental]);

    expect(row).toMatchObject({
      Status: "Rented Out",
      "Rental Status": "ACTIVE",
      "Sold On": "",
      "Sold For": "",
      Buyer: "",
      "Buyer Address": "",
    });
  });

  it("has the deposit held for the rental, and the day it was received, which isn't rent", () => {
    const [row] = exportOf([{ ...rental, rental_deposit: 9000, deposit_received_on: "2026-09-01" as any }]);

    expect(row).toMatchObject({
      "Monthly Rent": "₹4,000",
      "Deposit Held": "₹9,000",
      "Deposit Received On": expect.stringContaining("2026"),
    });
  });

  it("leaves the deposit empty for a rental with none, a sold piano and a piano that isn't a rental", () => {
    const rows = exportOf([
      rental,
      { ...rental, rental_deposit: 9000, sold_date: "2026-09-05" as any },
      makePiano({ $id: "warehouse", category: "warehouse", rental_deposit: 9000 } as any),
    ]);

    for (const row of rows) {
      expect(row["Deposit Held"]).toBe("");
      expect(row["Deposit Received On"]).toBe("");
    }
  });

  it("keeps every row the same width as the headers", () => {
    const [headers, ...rows] = parse(
      convertPianosToCSV([
        rental,
        { ...rental, $id: "sold", sold_date: inDays(-1), sold_price: 5 },
        makePiano({ $id: "warehouse" }),
      ])
    );

    rows.forEach((row) => expect(row).toHaveLength(headers.length));
  });
});
