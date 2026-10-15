import fs from "fs";
import path from "path";
import { COLUMN_LIMITS } from "@/constants/columnLimits";
import { formEventRow } from "@/utils/formEvents";

const { compareProjects, loadProject, rowProblem } = require("../scripts/appwriteSchema");
const { run } = require("../scripts/check-appwrite");
const functionConfig = require("../functions/delete-account/src/config");

/**
 * The live Appwrite project as the app expects it (appwrite/project.json,
 * pulled from Appwrite and kept in step by `npm run check:appwrite`): that the
 * app and the delete-account function point at tables that are there, that
 * nobody can read anyone else's rows or delete their photos, that the fields
 * stop where the columns do, and that the check and the tests' stand-in for
 * Appwrite refuse what the real project would.
 */

const root = path.join(__dirname, "..");
const project = loadProject();
const appwriteSource = fs.readFileSync(path.join(root, "lib", "appwrite.ts"), "utf8");
const configured = (name: string) => appwriteSource.match(new RegExp(`${name}: "([^"]+)"`))?.[1];
const tableById = (id: string | undefined) => project.tables.find((table: { $id: string }) => table.$id === id);
const tableNamed = (name: string) => project.tables.find((table: { name: string }) => table.name === name);
const copy = () => JSON.parse(JSON.stringify(project));

describe("the project the app expects", () => {
  it("has every table the app and the delete-account function use, under the IDs they use", () => {
    expect(configured("databaseId")).toBe(project.tablesDB[0].$id);
    const tables = {
      users: configured("userCollectionId"),
      pianos: configured("pianoCollectionId"),
      rent_payments: configured("rentPaymentsCollectionId"),
      rental_history: configured("rentalHistoryCollectionId"),
      form_events: configured("formEventsCollectionId"),
    };
    for (const [name, id] of Object.entries(tables)) {
      expect(tableById(id)?.name).toBe(name);
    }
    expect(tableById(functionConfig.rentalHistoryTableId)?.name).toBe("rental_history");
    expect(tableById(functionConfig.formEventsTableId)?.name).toBe("form_events");
    expect(project.tables.map((table: { name: string }) => table.name).sort()).toEqual(Object.keys(tables).sort());
  });

  it("lets a signed-in person add rows, and nobody read, change or delete another person's", () => {
    for (const table of project.tables) {
      expect([table.name, table.rowSecurity, table.$permissions]).toEqual([table.name, true, ['create("users")']]);
    }
  });

  it("shows the photos to anyone with their address, and lets only their owner change or delete one", () => {
    const [bucket] = project.buckets;

    expect(bucket.$id).toBe(configured("storageId"));
    expect(bucket.fileSecurity).toBe(true);
    expect([...bucket.$permissions].sort()).toEqual(['create("users")', 'read("any")']);
  });

  it("has an index for every way the app looks rows up", () => {
    const indexes = (name: string) => tableNamed(name).indexes.map((index: { columns: string[] }) => index.columns.join("+"));

    expect(indexes("pianos")).toContain("creator");
    expect(indexes("rent_payments")).toEqual(expect.arrayContaining(["creator+paid_on", "piano_id+paid_on"]));
    expect(indexes("rental_history")).toEqual(expect.arrayContaining(["creator", "piano_id"]));
    expect(indexes("form_events")).toContain("creator");
  });

  it("stops each text field at the length of its column", () => {
    for (const [tableName, limits] of Object.entries(COLUMN_LIMITS)) {
      for (const [key, limit] of Object.entries(limits)) {
        const column = tableNamed(tableName).columns.find((candidate: { key: string }) => candidate.key === key);
        expect([tableName, key, column?.size]).toEqual([tableName, key, limit]);
      }
    }
  });

  it("takes a form usage count as the app sends it", () => {
    const row = formEventRow({
      id: "e1",
      creator: "account-1",
      form: "agreement_hotel",
      action: "printed",
      pages: 4,
      happenedAt: "2026-10-15T09:00:00.000Z",
      appVersion: "1.1.20+a1b2c3d4",
      platform: "android",
    });

    expect(rowProblem(tableNamed("form_events"), row, { creating: true })).toBeNull();
  });
});

describe("what the real project refuses", () => {
  const payments = tableNamed("rent_payments");
  const pianos = tableNamed("pianos");
  const payment = { piano_id: "p1", creator: "a1", amount: 6000, paid_on: "2026-10-01T00:00:00.000Z" };

  it("takes a whole row, and a change to some of it", () => {
    expect(rowProblem(payments, { ...payment, note: "UPI", customer_name: "Mr. Dutt" }, { creating: true })).toBeNull();
    expect(rowProblem(payments, { amount: 5000 }, { creating: false })).toBeNull();
  });

  it("refuses a column the table doesn't have, and a row without a required one", () => {
    expect(rowProblem(payments, { ...payment, method: "upi" }, { creating: true })).toBe(
      'Invalid document structure: Unknown attribute: "method"'
    );
    expect(rowProblem(payments, { creator: "a1", amount: 1, paid_on: payment.paid_on }, { creating: true })).toBe(
      'Invalid document structure: Missing required attribute "piano_id"'
    );
    expect(rowProblem(payments, { piano_id: null }, { creating: false })).toBe(
      'Invalid document structure: Missing required attribute "piano_id"'
    );
  });

  it("refuses the wrong type, text that is too long, and a photo that isn't an address", () => {
    expect(rowProblem(payments, { amount: "6000" }, { creating: false })).toBe(
      'Invalid document structure: Attribute "amount" has invalid type. Value must be a valid float'
    );
    expect(rowProblem(payments, { paid_on: "yesterday" }, { creating: false })).toContain("valid date");
    expect(rowProblem(payments, { customer_name: "x".repeat(256) }, { creating: false })).toContain("no longer than 255 chars");
    expect(rowProblem(pianos, { image_url: "file:///photo.jpg" }, { creating: false })).toContain("valid URL");
    expect(rowProblem(pianos, { image_urls: ["https://a.example/1.jpg", 5] }, { creating: false })).toContain("valid string");
    expect(rowProblem(tableNamed("form_events"), { pages: 2.5 }, { creating: false })).toContain("valid integer");
    expect(rowProblem(tableNamed("form_events"), { pages: 20000 }, { creating: false })).toContain("range");
  });
});

describe("comparing the live project with the expected one", () => {
  it("finds nothing when they agree", () => {
    expect(compareProjects(project, copy())).toEqual([]);
  });

  it("names a table made with another ID than the app uses", () => {
    const live = copy();
    live.tables.find((table: { name: string }) => table.name === "rental_history").$id = "rental_history";

    expect(compareProjects(project, live)).toEqual([
      "Table rental_history (6abdffe40034432a5cde) is missing; a table named rental_history exists with the ID rental_history instead",
      "Table rental_history (rental_history) is in Appwrite but not in appwrite/project.json",
    ]);
  });

  it("names a missing column, a changed one, an extra one, and a missing index", () => {
    const live = copy();
    const livePayments = live.tables.find((table: { name: string }) => table.name === "rent_payments");
    livePayments.columns = livePayments.columns.filter((column: { key: string }) => column.key !== "customer_name");
    livePayments.columns.find((column: { key: string }) => column.key === "creator").size = 100;
    livePayments.columns.push({ key: "method", type: "varchar", size: 20, required: false, array: false });
    livePayments.indexes = [];

    expect(compareProjects(project, live)).toEqual([
      "Table rent_payments (rent_payments): column creator is varchar, size 100, required, expected varchar, size 255, required",
      "Table rent_payments (rent_payments): column customer_name (varchar, size 255, optional) is missing",
      "Table rent_payments (rent_payments): column method (varchar, size 20, optional) is in Appwrite but not in appwrite/project.json",
      "Table rent_payments (rent_payments): index by_creator_paid_on (creator, paid_on) is missing",
      "Table rent_payments (rent_payments): index by_piano_paid_on (piano_id, paid_on) is missing",
    ]);
  });

  it("notices when anyone could delete the photos again, or row security is off", () => {
    const live = copy();
    live.buckets[0].fileSecurity = false;
    live.buckets[0].$permissions.push('delete("users")');
    live.tables[0].rowSecurity = false;

    expect(compareProjects(project, live)).toEqual([
      "Table users (66b26b2a00163be2e73a): row security is off, expected on",
      "Bucket files (66b26b77003445e612b4): file security is off, expected on",
      'Bucket files (66b26b77003445e612b4): permissions are ["read(\\"any\\")","create(\\"users\\")","delete(\\"users\\")"], expected ["read(\\"any\\")","create(\\"users\\")"]',
    ]);
  });
});

describe("npm run check:appwrite", () => {
  /** Stands in for the Appwrite CLI: writes `live` into the file it is asked to pull into. */
  const pullInto = (live: object) => (args: string[]) => {
    const file = args[args.indexOf("--config-file") + 1];
    const current = JSON.parse(fs.readFileSync(file, "utf8"));
    fs.writeFileSync(file, JSON.stringify({ ...current, ...live }));
    return null;
  };

  it("says so when Appwrite matches", () => {
    const log = jest.fn();

    expect(run({ expected: project, pull: pullInto(copy()), log })).toBe(0);
    expect(log).toHaveBeenCalledWith("Appwrite matches appwrite/project.json: 5 tables and 1 bucket.");
  });

  it("lists each difference and fails", () => {
    const live = copy();
    live.tables = live.tables.filter((table: { name: string }) => table.name !== "form_events");
    const log = jest.fn();

    expect(run({ expected: project, pull: pullInto(live), log })).toBe(1);
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      "Appwrite differs from what the app expects (appwrite/project.json), 1 difference:",
      "  - Table form_events (form_events) is missing",
    ]);
  });

  it("explains when the CLI can't read the project", () => {
    const log = jest.fn();

    expect(run({ expected: project, pull: () => "Session not found", log })).toBe(2);
    expect(log.mock.calls[0][0]).toContain("Is the Appwrite CLI signed in (appwrite login)?");
  });
});
