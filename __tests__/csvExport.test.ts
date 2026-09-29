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
