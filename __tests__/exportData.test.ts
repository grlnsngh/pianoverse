jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///docs/",
  EncodingType: { UTF8: "utf8" },
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  getContentUriAsync: jest.fn((uri: string) => Promise.resolve(`content://${uri}`)),
}));
jest.mock("expo-sharing", () => ({ shareAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("expo-intent-launcher", () => ({
  startActivityAsync: jest.fn(() => Promise.resolve()),
}));

import { Alert, Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as appwrite from "@/lib/appwrite";
import { exportCustomers, exportPayments } from "@/lib/exportData";
import { ExportPeriod, exportPeriods } from "@/utils/exportPeriods";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";

/**
 * Downloading the payments of a period and the customers, against a fake
 * Appwrite and a fake phone. Today is 29 September 2026.
 */

const write = jest.mocked(FileSystem.writeAsStringAsync);
const BOM = "﻿";
const ACCOUNT = testUser.accountId;

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
const weber = makePiano({ $id: "weber", title: "Weber W-121", category: "warehouse" });
const pianos = [kawai, weber];

let counter = 0;
const seed = (paidOn: string, amount: number, extra: Record<string, unknown> = {}) => {
  const id = `p-${++counter}`;
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: `${paidOn}T09:00:00.000+00:00`,
    piano_id: "kawai",
    creator: ACCOUNT,
    amount,
    paid_on: paidOn,
    customer_name: "Asha Mehta",
    ...extra,
  });
};

const period = (key: ExportPeriod["key"]) => exportPeriods().find((candidate) => candidate.key === key)!;

/** What was written, and where. */
const written = () => {
  const [uri, content] = write.mock.calls[0] as [string, string];
  return { uri, content, lines: content.replace(BOM, "").split("\n") };
};

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  fakeBackend.reset();
  counter = 0;
  write.mockResolvedValue(undefined);
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.replaceProperty(Platform, "OS", "android");
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("downloading payments", () => {
  it("writes the payments of the period, with the piano's name, oldest first", async () => {
    seed("2026-08-20", 1111);
    seed("2026-09-20", 3000);
    seed("2026-09-02", 4000, { note: "UPI" });
    seed("2026-10-02", 9999);

    await exportPayments(ACCOUNT, pianos, period("this-month"));

    expect(written().lines).toEqual([
      "Date paid,Customer,Piano,Amount,Note,Recorded on",
      "2026-09-02,Asha Mehta,Kawai K-300,4000,UPI,2026-09-02",
      "2026-09-20,Asha Mehta,Kawai K-300,3000,,2026-09-20",
    ]);
  });

  it("starts the file with the byte order mark Excel needs, and nothing else changes the text", async () => {
    seed("2026-09-02", 4000);

    await exportPayments(ACCOUNT, pianos, period("this-month"));

    expect(written().content.startsWith(BOM + "Date paid,")).toBe(true);
  });

  it("is named for the period and the time", async () => {
    seed("2026-09-02", 4000);

    await exportPayments(ACCOUNT, pianos, period("this-month"));
    expect(written().uri).toMatch(/^file:\/\/\/docs\/payments_2026-09_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);

    write.mockClear();
    await exportPayments(ACCOUNT, pianos, period("this-financial-year"));
    expect(written().uri).toContain("payments_fy-2026-27_");

    write.mockClear();
    await exportPayments(ACCOUNT, pianos, period("all"));
    expect(written().uri).toContain("payments_all_");
  });

  it("has last month's payments for last month (August, on 29 September)", async () => {
    seed("2026-07-31", 1);
    seed("2026-08-01", 2);
    seed("2026-08-31", 3);
    seed("2026-09-01", 4);

    await exportPayments(ACCOUNT, pianos, period("last-month"));

    expect(written().lines.slice(1).map((line) => line.split(",")[3])).toEqual(["2", "3"]);
  });

  it("has this financial year's payments, April to March", async () => {
    seed("2026-03-31", 1);
    seed("2026-04-01", 2);
    seed("2026-12-15", 3);
    seed("2027-03-31", 4);
    seed("2027-04-01", 5);

    await exportPayments(ACCOUNT, pianos, period("this-financial-year"));

    expect(written().lines.slice(1).map((line) => line.split(",")[3])).toEqual(["2", "3", "4"]);
  });

  it("has last financial year's payments", async () => {
    seed("2025-03-31", 1);
    seed("2025-04-01", 2);
    seed("2026-03-31", 3);
    seed("2026-04-01", 4);

    await exportPayments(ACCOUNT, pianos, period("last-financial-year"));

    expect(written().lines.slice(1).map((line) => line.split(",")[3])).toEqual(["2", "3"]);
  });

  it("has every payment for all, from any year", async () => {
    seed("2024-01-05", 1);
    seed("2025-06-05", 2);
    seed("2026-09-29", 3);

    await exportPayments(ACCOUNT, pianos, period("all"));

    expect(written().lines.slice(1).map((line) => line.split(",")[3])).toEqual(["1", "2", "3"]);
  });

  it("has only this owner's payments", async () => {
    seed("2026-09-02", 4000);
    seed("2026-09-03", 7777, { creator: "someone-else" });

    await exportPayments(ACCOUNT, pianos, period("this-month"));

    expect(written().lines).toHaveLength(2);
    expect(written().content).not.toContain("7777");
  });

  it("has every page of them, not just the first", async () => {
    for (let i = 0; i < 130; i++) seed("2026-09-10", 1);

    await exportPayments(ACCOUNT, pianos, period("this-month"));

    expect(written().lines).toHaveLength(131);
  });

  it("opens the file in a spreadsheet app", async () => {
    seed("2026-09-02", 4000);

    await exportPayments(ACCOUNT, pianos, period("this-month"));

    const IntentLauncher = require("expo-intent-launcher");
    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith(
      "android.intent.action.VIEW",
      expect.objectContaining({ type: "text/csv" })
    );
  });

  it("says there is nothing, naming the period, and writes no file", async () => {
    seed("2026-08-20", 1111);

    await exportPayments(ACCOUNT, pianos, period("this-month"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "No Data",
      "There are no payments recorded for this month (September 2026)."
    );
    expect(write).not.toHaveBeenCalled();
  });

  it("says there is nothing at all, when there are no payments anywhere", async () => {
    await exportPayments(ACCOUNT, pianos, period("all"));

    expect(Alert.alert).toHaveBeenCalledWith("No Data", "There are no payments to export yet.");
    expect(write).not.toHaveBeenCalled();
  });

  it("says why when the payments can't be loaded", async () => {
    fakeBackend.missingCollections.add("rent_payments");

    await exportPayments(ACCOUNT, pianos, period("all"));

    expect(Alert.alert).toHaveBeenCalledWith("Export Failed", expect.stringContaining("Failed to export CSV:"));
    expect(write).not.toHaveBeenCalled();
  });

  it("says why when the file can't be written", async () => {
    seed("2026-09-02", 4000);
    write.mockRejectedValue(new Error("No space left"));

    await exportPayments(ACCOUNT, pianos, period("this-month"));

    expect(Alert.alert).toHaveBeenCalledWith("Export Failed", "Failed to export CSV: No space left");
  });

  it("asks for the period it was given, from Appwrite, when it is pressed", async () => {
    const between = jest.spyOn(appwrite, "getRentPaymentsBetween");
    seed("2026-09-02", 4000);

    await exportPayments(ACCOUNT, pianos, period("last-financial-year"));

    expect(between).toHaveBeenCalledWith(ACCOUNT, new Date(2025, 3, 1), new Date(2026, 3, 1));
  });
});

describe("downloading customers", () => {
  const history = (extra: Record<string, unknown> = {}) => {
    const id = `h-${++counter}`;
    fakeBackend.history.set(id, {
      $id: id,
      $createdAt: "2026-09-01T00:00:00.000+00:00",
      piano_id: "weber",
      creator: ACCOUNT,
      customer_name: "Priya Nair",
      piano_title: "Weber W-121",
      period_start: "2025-06-01",
      period_end: "2025-09-01",
      price: 3500,
      closed_on: "2025-09-02",
      reason: "replaced",
      ...extra,
    });
  };

  it("writes who has rented, what they paid and whether they have a piano now", async () => {
    seed("2026-08-02", 4000);
    seed("2026-09-03", 4000);
    seed("2026-09-10", 1500, { piano_id: "weber", customer_name: "Ravi Kumar" });

    await exportCustomers(ACCOUNT, pianos);

    expect(written().lines).toEqual([
      "Customer,Mobile,Renting now,Pianos,Payments,Total paid,Last payment,Earlier rentals",
      "Asha Mehta,9876543210,Yes,Kawai K-300,2,8000,2026-09-03,0",
      "Ravi Kumar,,No,Weber W-121,1,1500,2026-09-10,0",
    ]);
  });

  it("is named customers_ and the time, with the byte order mark", async () => {
    seed("2026-09-03", 4000);

    await exportCustomers(ACCOUNT, pianos);

    expect(written().uri).toMatch(/^file:\/\/\/docs\/customers_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
    expect(written().content.startsWith(BOM + "Customer,")).toBe(true);
  });

  it("counts payments from every year, not just this one", async () => {
    seed("2024-05-02", 3000);
    seed("2026-09-03", 4000);

    await exportCustomers(ACCOUNT, pianos);

    expect(written().lines[1]).toBe("Asha Mehta,9876543210,Yes,Kawai K-300,2,7000,2026-09-03,0");
  });

  it("has someone who only appears in a kept rental, and counts the rentals kept", async () => {
    seed("2026-09-03", 4000);
    history();
    history({ period_start: "2024-01-01", period_end: "2024-04-01", closed_on: "2024-04-02" });

    await exportCustomers(ACCOUNT, pianos);

    const priya = written().lines.find((line) => line.startsWith("Priya Nair"));
    expect(priya).toBe("Priya Nair,,No,Weber W-121,0,0,,2");
  });

  it("is still written without the kept rentals when they can't be loaded", async () => {
    seed("2026-09-03", 4000);
    jest.spyOn(appwrite, "getRentalHistory").mockRejectedValue(new Error("offline"));

    await exportCustomers(ACCOUNT, pianos);

    expect(written().lines).toHaveLength(2);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("is still written when the rental_history table isn't there", async () => {
    seed("2026-09-03", 4000);
    fakeBackend.missingCollections.add("rental_history");

    await exportCustomers(ACCOUNT, pianos);

    expect(written().lines).toHaveLength(2);
  });

  it("says there is nothing, and how customers come to be, when there are none", async () => {
    await exportCustomers(ACCOUNT, [weber]);

    expect(Alert.alert).toHaveBeenCalledWith(
      "No Data",
      "There are no customers to export yet. They appear once a rent payment is recorded or a piano is rented."
    );
    expect(write).not.toHaveBeenCalled();
  });

  it("has a customer who has a piano but no payments yet", async () => {
    await exportCustomers(ACCOUNT, pianos);

    expect(written().lines[1]).toBe("Asha Mehta,9876543210,Yes,Kawai K-300,0,0,,0");
  });

  it("says why when the payments can't be loaded", async () => {
    fakeBackend.missingCollections.add("rent_payments");

    await exportCustomers(ACCOUNT, pianos);

    expect(Alert.alert).toHaveBeenCalledWith("Export Failed", expect.stringContaining("Failed to export CSV:"));
    expect(write).not.toHaveBeenCalled();
  });

  it("says why when the file can't be written", async () => {
    seed("2026-09-03", 4000);
    write.mockRejectedValue(new Error("No space left"));

    await exportCustomers(ACCOUNT, pianos);

    expect(Alert.alert).toHaveBeenCalledWith("Export Failed", "Failed to export CSV: No space left");
  });

  it("has only this owner's customers", async () => {
    seed("2026-09-03", 4000);
    seed("2026-09-04", 9000, { creator: "someone-else", customer_name: "Stranger Danger" });

    await exportCustomers(ACCOUNT, pianos);

    expect(written().content).not.toContain("Stranger");
  });
});
