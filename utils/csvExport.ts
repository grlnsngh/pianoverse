import { PianoItem } from "@/redux/pianos/types";
import { formatDate } from "./ObjectManipulation";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { Alert, Platform } from "react-native";
import { differenceInCalendarDays, startOfToday } from "date-fns";
import { parseStoredDate } from "./dates";
import { heldDeposit } from "./deposits";
import { purchasePriceOf } from "./pianoMoney";
import { isSold } from "./pianoStatus";

/**
 * A spreadsheet reads a field that starts with = or @ as a formula, which
 * could be made to do things, and so one that starts with + or -, unless it is
 * only a number or a phone number ("-500", "+91 98765 43210"): digits, spaces,
 * dots, commas, brackets and hyphens can't call anything. "-1+cmd|…" starts
 * like a negative number but isn't one. A text field like that gets a ' in
 * front, so it is shown as the text it is. For what a person typed (a title,
 * a name, an address), not for dates, prices and statuses the app works out.
 */
export const asText = (value: string | null | undefined) => {
  const text = value?.trim() ?? "";
  const formula = /^(=|@)/.test(text) || (/^[+-]/.test(text) && !/^[+-][\d\s.,()-]+$/.test(text));
  return formula ? `'${text}` : text;
};

/**
 * Escapes CSV field values by wrapping them in quotes if they contain special characters
 */
export const escapeCSVField = (field: unknown): string => {
  if (field === null || field === undefined) return "";
  const stringField = String(field);
  // If the field contains comma, quote, or newline, wrap it in quotes and escape internal quotes
  if (
    stringField.includes(",") ||
    stringField.includes('"') ||
    stringField.includes("\n")
  ) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

/**
 * Calculate rental status and days remaining
 */
const getRentalStatus = (
  endDate: Date | string | null | undefined
): { status: string; daysRemaining: number } => {
  const end = parseStoredDate(endDate);
  if (!end) return { status: "N/A", daysRemaining: 0 };

  const daysRemaining = differenceInCalendarDays(end, startOfToday());

  if (daysRemaining < 0) return { status: "EXPIRED", daysRemaining };
  if (daysRemaining === 0) return { status: "EXPIRES TODAY", daysRemaining: 0 };
  if (daysRemaining <= 7) return { status: "EXPIRING SOON", daysRemaining };
  return { status: "ACTIVE", daysRemaining };
};

/**
 * Format category name to be user-friendly
 */
const formatCategory = (category: string): string => {
  const categoryMap: { [key: string]: string } = {
    rentable: "Rented Out",
    warehouse: "In Warehouse",
    events: "For Events",
    on_sale: "For Sale",
  };
  return categoryMap[category.toLowerCase()] || category;
};

/**
 * Format price with currency
 */
const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return "";
  return `₹${price.toLocaleString("en-IN")}`;
};

/**
 * Converts an array of piano items to CSV format with user-friendly headers and conditional data
 */
export const convertPianosToCSV = (pianos: PianoItem[]): string => {
  // Define user-friendly CSV headers
  const headers = [
    "Piano Name",
    "Status",
    "Brand/Make",
    "Company/Owner",
    "Purchase Date",
    "Bought For",

    // Rental Information
    "Rental Customer Name",
    "Customer Phone",
    "Customer Address",
    "Rental Start Date",
    "Rental End Date",
    "Rental Status",
    "Days Until Due",
    "Monthly Rent",
    "Deposit Held",
    "Deposit Received On",

    // Warehouse Information
    "Warehouse Storage Date",
    "Days in Warehouse",

    // Event Information
    "Purchased From (Event)",
    "Model Number",
    "B Number",

    // Sale Information
    "Sale Price",
    "Purchased From (Sale)",
    "Import Date",

    // Once sold
    "Sold On",
    "Sold For",
    "Buyer",
    "Buyer Address",

    // Additional Info
    "Notes/Description",
    "Date Added",
    "Last Updated",
  ];

  // Create CSV rows with conditional logic
  const rows = pianos.map((piano) => {
    const sold = isSold(piano);
    // A sold piano's rental is over, so it is neither running nor due
    const rentalStatus = sold
      ? { status: "", daysRemaining: 0 }
      : getRentalStatus(piano.rental_period_end);

    // Calculate days in warehouse
    let daysInWarehouse = "";
    if (piano.warehouse_since_date) {
      const since = parseStoredDate(piano.warehouse_since_date);
      const days = since ? differenceInCalendarDays(startOfToday(), since) : 0;
      daysInWarehouse = days > 0 ? `${days} days` : "0 days";
    }

    return [
      // Basic Info
      escapeCSVField(asText(piano.title)),
      escapeCSVField(sold ? "Sold" : formatCategory(piano.category)),
      escapeCSVField(asText(piano.make)),
      escapeCSVField(asText(piano.company_associated)),
      escapeCSVField(
        piano.date_of_purchase ? formatDate(piano.date_of_purchase) : ""
      ),
      escapeCSVField(formatPrice(purchasePriceOf(piano))),

      // Rental Information (only for rentable pianos)
      escapeCSVField(
        piano.category.toLowerCase() === "rentable"
          ? asText(piano.rental_customer_name)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "rentable"
          ? asText(piano.rental_customer_mobile)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "rentable"
          ? asText(piano.rental_customer_address)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "rentable" && piano.rental_period_start
          ? formatDate(piano.rental_period_start)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "rentable" && piano.rental_period_end
          ? formatDate(piano.rental_period_end)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "rentable" ? rentalStatus.status : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "rentable" &&
          rentalStatus.daysRemaining > 0
          ? `${rentalStatus.daysRemaining} days`
          : piano.category.toLowerCase() === "rentable" &&
            rentalStatus.daysRemaining < 0
          ? `Overdue by ${Math.abs(rentalStatus.daysRemaining)} days`
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "rentable" && piano.rental_price
          ? formatPrice(piano.rental_price)
          : ""
      ),
      // A refundable deposit held for the rental: not rent, and not income
      escapeCSVField(heldDeposit(piano) ? formatPrice(heldDeposit(piano)!.amount) : ""),
      escapeCSVField(heldDeposit(piano)?.since ? formatDate(heldDeposit(piano)!.since!) : ""),

      // Warehouse Information (only for warehouse pianos)
      escapeCSVField(
        piano.category.toLowerCase() === "warehouse" &&
          piano.warehouse_since_date
          ? formatDate(piano.warehouse_since_date)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "warehouse" ? daysInWarehouse : ""
      ),

      // Event Information (only for event pianos)
      escapeCSVField(
        piano.category.toLowerCase() === "events"
          ? asText(piano.event_purchase_from)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "events"
          ? asText(piano.event_model_number)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "events" ? asText(piano.event_b_number) : ""
      ),

      // Sale Information (only for sale pianos)
      escapeCSVField(
        piano.category.toLowerCase() === "on_sale" && piano.on_sale_price
          ? formatPrice(piano.on_sale_price)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "on_sale"
          ? asText(piano.on_sale_purchase_from)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "on_sale" && piano.on_sale_import_date
          ? formatDate(piano.on_sale_import_date)
          : ""
      ),

      // Sale Information (only for sold pianos)
      escapeCSVField(sold ? formatDate(piano.sold_date) : ""),
      escapeCSVField(
        sold && piano.sold_price ? formatPrice(piano.sold_price) : ""
      ),
      escapeCSVField(sold ? asText(piano.sold_to_name) : ""),
      escapeCSVField(sold ? asText(piano.sold_to_address) : ""),

      // Additional Info
      escapeCSVField(asText(piano.description)),
      escapeCSVField(formatDate(piano.$createdAt)),
      escapeCSVField(formatDate(piano.$updatedAt)),
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
};

/**
 * The byte order mark that tells Excel a file is UTF-8, so a ₹ or a name in
 * Hindi isn't read as something else. Spreadsheet apps on a phone ignore it.
 */
export const CSV_BOM = "\uFEFF";

/** A CSV file's text: the header line and a line for each row, fields escaped. */
export const toCSVText = (headers: string[], rows: unknown[][]): string =>
  [headers.map(escapeCSVField).join(","), ...rows.map((row) => row.map(escapeCSVField).join(","))].join(
    "\n"
  );

/** "2026-10-01T09-30-00", for the end of a file's name. */
export const fileTimestamp = (now = new Date()): string =>
  now.toISOString().replace(/[:.]/g, "-").slice(0, -5);

/** Tells the person an export didn't work, with the reason. */
export const reportExportFailure = (error: unknown) => {
  console.error("Error exporting CSV:", error);
  Alert.alert(
    "Export Failed",
    `Failed to export CSV: ${error instanceof Error ? error.message : "Unknown error"}`
  );
};

/**
 * Saves a CSV file and opens it: straight in a spreadsheet app on Android (the
 * share sheet if none takes it), the share sheet on iPhone, and a message with
 * where it was saved elsewhere.
 *
 * @throws {Error} If the file can't be written or shared; the caller tells the person.
 */
export const saveAndOpenCSV = async (fileName: string, content: string): Promise<void> => {
  const file = new File(Paths.document, fileName);
  const fileUri = file.uri;

  // Write to file (as UTF-8), replacing an earlier export with the same name.
  // Writing is asynchronous since Expo SDK 58: opening the file before it is done would open an empty one
  file.create({ overwrite: true });
  await file.write(content);

  // Try to open directly in spreadsheet apps
  if (Platform.OS === "android") {
    try {
      // Try to open with intent launcher for spreadsheet apps, through the
      // content:// address other apps may read
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: file.contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: "text/csv",
      });
    } catch (intentError) {
      console.warn("No app opened the CSV directly, sharing it instead:", intentError);
      // If direct opening fails, use share as fallback
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Open CSV file with...",
        UTI: "public.comma-separated-values-text",
      });
    }
  } else if (Platform.OS === "ios") {
    // On iOS, use share which shows apps that can open CSV files
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: "Open CSV file with...",
      UTI: "public.comma-separated-values-text",
    });
  } else {
    // Web or other platforms
    Alert.alert("Export Successful", `File saved to: ${fileUri}`, [{ text: "OK" }]);
  }
};

/**
 * Exports piano data to CSV and opens directly in spreadsheet apps
 */
export const exportPianosToCSV = async (pianos: PianoItem[]): Promise<void> => {
  try {
    if (pianos.length === 0) {
      Alert.alert("No Data", "There are no pianos to export.");
      return;
    }

    await saveAndOpenCSV(
      `pianos_export_${fileTimestamp()}.csv`,
      convertPianosToCSV(pianos)
    );
  } catch (error) {
    reportExportFailure(error);
  }
};
