import { PianoItem } from "@/redux/pianos/types";
import { formatDate } from "./ObjectManipulation";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { Alert, Platform } from "react-native";
import { differenceInDays } from "date-fns";

/**
 * Escapes CSV field values by wrapping them in quotes if they contain special characters
 */
const escapeCSVField = (field: any): string => {
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
  if (!endDate) return { status: "N/A", daysRemaining: 0 };

  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const daysRemaining = differenceInDays(end, today);

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

    // Rental Information
    "Rental Customer Name",
    "Customer Phone",
    "Customer Address",
    "Rental Start Date",
    "Rental End Date",
    "Rental Status",
    "Days Until Due",
    "Monthly Rent",

    // Warehouse Information
    "Warehouse Storage Date",
    "Days in Warehouse",

    // Event Information
    "Event Purchase Price",
    "Purchased From (Event)",
    "Model Number",
    "B Number",

    // Sale Information
    "Sale Price",
    "Purchased From (Sale)",
    "Import Date",

    // Additional Info
    "Notes/Description",
    "Date Added",
    "Last Updated",
  ];

  // Create CSV rows with conditional logic
  const rows = pianos.map((piano) => {
    const rentalStatus = getRentalStatus(piano.rental_period_end);

    // Calculate days in warehouse
    let daysInWarehouse = "";
    if (piano.warehouse_since_date) {
      const days = differenceInDays(
        new Date(),
        new Date(piano.warehouse_since_date)
      );
      daysInWarehouse = days > 0 ? `${days} days` : "0 days";
    }

    return [
      // Basic Info
      escapeCSVField(piano.title),
      escapeCSVField(formatCategory(piano.category)),
      escapeCSVField(piano.make),
      escapeCSVField(piano.company_associated),
      escapeCSVField(
        piano.date_of_purchase ? formatDate(piano.date_of_purchase) : ""
      ),

      // Rental Information (only for rentable pianos)
      escapeCSVField(
        piano.category.toLowerCase() === "rentable"
          ? piano.rental_customer_name
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "rentable"
          ? piano.rental_customer_mobile
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "rentable"
          ? piano.rental_customer_address
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
        piano.category.toLowerCase() === "events" && piano.event_purchase_price
          ? formatPrice(piano.event_purchase_price)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "events"
          ? piano.event_purchase_from
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "events"
          ? piano.event_model_number
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "events" ? piano.event_b_number : ""
      ),

      // Sale Information (only for sale pianos)
      escapeCSVField(
        piano.category.toLowerCase() === "on_sale" && piano.on_sale_price
          ? formatPrice(piano.on_sale_price)
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "on_sale"
          ? piano.on_sale_purchase_from
          : ""
      ),
      escapeCSVField(
        piano.category.toLowerCase() === "on_sale" && piano.on_sale_import_date
          ? formatDate(piano.on_sale_import_date)
          : ""
      ),

      // Additional Info
      escapeCSVField(piano.description),
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
 * Exports piano data to CSV and opens directly in spreadsheet apps
 */
export const exportPianosToCSV = async (pianos: PianoItem[]): Promise<void> => {
  try {
    if (pianos.length === 0) {
      Alert.alert("No Data", "There are no pianos to export.");
      return;
    }

    // Convert to CSV
    const csvContent = convertPianosToCSV(pianos);

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const fileName = `pianos_export_${timestamp}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Write to file
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    console.log("CSV file saved to:", fileUri);

    // Try to open directly in spreadsheet apps
    if (Platform.OS === "android") {
      try {
        // Get file info to get content URI
        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        
        // Try to open with intent launcher for spreadsheet apps
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: "text/csv",
        });
        
        console.log("Opened CSV with spreadsheet app");
      } catch (intentError) {
        console.log("Intent launcher failed, falling back to share:", intentError);
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
      Alert.alert("Export Successful", `File saved to: ${fileUri}`, [
        { text: "OK" },
      ]);
    }
  } catch (error) {
    console.error("Error exporting CSV:", error);
    Alert.alert(
      "Export Failed",
      `Failed to export CSV: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
