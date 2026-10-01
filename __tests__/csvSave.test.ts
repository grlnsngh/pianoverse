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
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import {
  CSV_BOM,
  exportPianosToCSV,
  fileTimestamp,
  reportExportFailure,
  saveAndOpenCSV,
  toCSVText,
} from "@/utils/csvExport";
import { makePiano } from "./helpers/fixtures";

/** Making a CSV file and getting it in front of the person, which every download shares. */

const write = jest.mocked(FileSystem.writeAsStringAsync);
const launch = jest.mocked(IntentLauncher.startActivityAsync);
const share = jest.mocked(Sharing.shareAsync);

beforeEach(() => {
  jest.clearAllMocks();
  write.mockResolvedValue(undefined);
  launch.mockResolvedValue({ resultCode: 0 } as any);
  share.mockResolvedValue(undefined);
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.replaceProperty(Platform, "OS", "android");
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("CSV text", () => {
  it("is the header line and a line for each row, joined by new lines, with none at the end", () => {
    expect(toCSVText(["A", "B"], [[1, "x"], [2, "y"]])).toBe("A,B\n1,x\n2,y");
  });

  it("quotes a field with a comma, a quote or a new line, and doubles the quotes", () => {
    expect(toCSVText(["Note"], [['a, "b"'], ["line\nbreak"], ["plain"]])).toBe(
      'Note\n"a, ""b"""\n"line\nbreak"\nplain'
    );
  });

  it("leaves nothing for a missing field, and writes numbers as they are", () => {
    expect(toCSVText(["A", "B", "C"], [[null, undefined, 0], [4000, 4500.5, ""]])).toBe("A,B,C\n,,0\n4000,4500.5,");
  });

  it("is only the header for no rows", () => {
    expect(toCSVText(["A", "B"], [])).toBe("A,B");
  });

  it("quotes a header that needs it too", () => {
    expect(toCSVText(["Date, paid"], [])).toBe('"Date, paid"');
  });

  it("has a byte order mark that tells Excel it is UTF-8", () => {
    expect(CSV_BOM).toBe("﻿");
    expect(CSV_BOM).toHaveLength(1);
  });
});

describe("the end of a file's name", () => {
  it("is the day and time with no characters a file can't have", () => {
    expect(fileTimestamp(new Date("2026-10-01T09:30:15.123Z"))).toBe("2026-10-01T09-30-15");
    expect(fileTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
  });
});

describe("saving and opening a file", () => {
  it("writes it where the app keeps its files, as UTF-8", async () => {
    await saveAndOpenCSV("a.csv", "x,y\n1,2");

    expect(write).toHaveBeenCalledWith("file:///docs/a.csv", "x,y\n1,2", { encoding: "utf8" });
  });

  it("opens it straight in a spreadsheet app on Android", async () => {
    await saveAndOpenCSV("a.csv", "x");

    expect(FileSystem.getContentUriAsync).toHaveBeenCalledWith("file:///docs/a.csv");
    expect(launch).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "content://file:///docs/a.csv",
      flags: 1,
      type: "text/csv",
    });
    expect(share).not.toHaveBeenCalled();
  });

  it("shares it when no app opens it on Android", async () => {
    launch.mockRejectedValue(new Error("No Activity found"));

    await saveAndOpenCSV("a.csv", "x");

    expect(share).toHaveBeenCalledWith("file:///docs/a.csv", expect.objectContaining({ mimeType: "text/csv" }));
  });

  it("shares it on an iPhone, which has no such thing as opening it straight", async () => {
    jest.replaceProperty(Platform, "OS", "ios");

    await saveAndOpenCSV("a.csv", "x");

    expect(share).toHaveBeenCalledWith(
      "file:///docs/a.csv",
      expect.objectContaining({ mimeType: "text/csv", UTI: "public.comma-separated-values-text" })
    );
    expect(launch).not.toHaveBeenCalled();
  });

  it("says where it was saved, anywhere else", async () => {
    jest.replaceProperty(Platform, "OS", "web");

    await saveAndOpenCSV("a.csv", "x");

    expect(Alert.alert).toHaveBeenCalledWith("Export Successful", "File saved to: file:///docs/a.csv", [{ text: "OK" }]);
  });

  it("fails, for the caller to tell the person, when the file can't be written", async () => {
    write.mockRejectedValue(new Error("No space left"));

    await expect(saveAndOpenCSV("a.csv", "x")).rejects.toThrow("No space left");
    expect(launch).not.toHaveBeenCalled();
  });

  it("fails when it can't be shared either", async () => {
    launch.mockRejectedValue(new Error("none"));
    share.mockRejectedValue(new Error("Sharing isn't available"));

    await expect(saveAndOpenCSV("a.csv", "x")).rejects.toThrow("Sharing isn't available");
  });
});

describe("telling the person a download failed", () => {
  it("gives the reason", () => {
    reportExportFailure(new Error("No space left"));

    expect(Alert.alert).toHaveBeenCalledWith("Export Failed", "Failed to export CSV: No space left");
  });

  it("says Unknown error when there is none", () => {
    reportExportFailure("something");

    expect(Alert.alert).toHaveBeenCalledWith("Export Failed", "Failed to export CSV: Unknown error");
  });
});

describe("the piano list download, as before", () => {
  it("says there is nothing to export for no pianos, and writes nothing", async () => {
    await exportPianosToCSV([]);

    expect(Alert.alert).toHaveBeenCalledWith("No Data", "There are no pianos to export.");
    expect(write).not.toHaveBeenCalled();
  });

  it("writes pianos_export_ and the time, with the piano header, without a byte order mark", async () => {
    await exportPianosToCSV([makePiano({ title: "Yamaha U1" })]);

    const [uri, content] = write.mock.calls[0] as [string, string];
    expect(uri).toMatch(/^file:\/\/\/docs\/pianos_export_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
    expect(content.startsWith("Piano Name,Status")).toBe(true);
    expect(content).toContain("Yamaha U1");
    expect(launch).toHaveBeenCalled();
  });

  it("says why when it fails", async () => {
    write.mockRejectedValue(new Error("No space left"));

    await exportPianosToCSV([makePiano()]);

    expect(Alert.alert).toHaveBeenCalledWith("Export Failed", "Failed to export CSV: No space left");
  });
});
