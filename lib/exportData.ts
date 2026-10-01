import { addMonths, startOfMonth } from "date-fns";
import { Alert } from "react-native";
import { getRentalHistory, getRentPaymentsBetween } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import {
  CSV_BOM,
  fileTimestamp,
  reportExportFailure,
  saveAndOpenCSV,
} from "@/utils/csvExport";
import { buildCustomers } from "@/utils/customers";
import { ALL_PAYMENTS_FROM, ExportPeriod } from "@/utils/exportPeriods";
import { convertCustomersToCSV, convertPaymentsToCSV } from "@/utils/ledgerCsv";

/**
 * Downloads the payments of a period as a CSV file and opens it. The payments
 * are asked for when it is pressed, so the file has what is recorded now. A
 * period with no payments says so instead of making an empty file.
 *
 * @param {string} accountId - The signed-in owner's account ID.
 * @param {PianoItem[]} pianos - The pianos, for the name beside each payment.
 * @param {ExportPeriod} period - The days to export.
 */
export const exportPayments = async (
  accountId: string,
  pianos: PianoItem[],
  period: ExportPeriod
): Promise<void> => {
  try {
    const payments = await getRentPaymentsBetween(accountId, period.from, period.to);
    if (payments.length === 0) {
      Alert.alert(
        "No Data",
        period.key === "all"
          ? "There are no payments to export yet."
          : `There are no payments recorded for ${period.label.toLowerCase()} (${period.detail}).`
      );
      return;
    }

    await saveAndOpenCSV(
      `payments_${period.slug}_${fileTimestamp()}.csv`,
      CSV_BOM + convertPaymentsToCSV(payments, pianos)
    );
  } catch (error) {
    reportExportFailure(error);
  }
};

/**
 * Downloads the customers as a CSV file and opens it: the same list as the
 * Customers screen, from every payment recorded and the rentals that were kept
 * (those are an extra: without them, or without the table, the file has the rest).
 *
 * @param {string} accountId - The signed-in owner's account ID.
 * @param {PianoItem[]} pianos - The pianos, for who has one now.
 */
export const exportCustomers = async (accountId: string, pianos: PianoItem[]): Promise<void> => {
  try {
    const [payments, history] = await Promise.all([
      getRentPaymentsBetween(
        accountId,
        ALL_PAYMENTS_FROM,
        addMonths(startOfMonth(new Date()), 1)
      ),
      getRentalHistory(accountId).catch((error) => {
        console.warn("Could not load the rental history for the export:", error);
        return [];
      }),
    ]);

    const { customers } = buildCustomers(payments, pianos, history);
    if (customers.length === 0) {
      Alert.alert(
        "No Data",
        "There are no customers to export yet. They appear once a rent payment is recorded or a piano is rented."
      );
      return;
    }

    await saveAndOpenCSV(
      `customers_${fileTimestamp()}.csv`,
      CSV_BOM + convertCustomersToCSV(customers)
    );
  } catch (error) {
    reportExportFailure(error);
  }
};
