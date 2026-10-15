/**
 * Where Pianoverse keeps its data: the same IDs as `appwriteConfig` in the
 * app's lib/appwrite.ts (a test there checks they agree). The function runs
 * on Appwrite, apart from the app, so it can't import them.
 */
module.exports = {
  endpoint: "https://cloud.appwrite.io/v1",
  projectId: "66b2693000154e2fa3c8",
  databaseId: "66b26b1300171b9140be",
  // Collections ("tables" in Appwrite 1.8)
  userTableId: "66b26b2a00163be2e73a",
  pianoTableId: "66b26b3c002284a5a862",
  rentPaymentsTableId: "rent_payments",
  // Named rental_history in the console; it was made with an ID of its own
  rentalHistoryTableId: "6abdffe40034432a5cde",
  // The paper forms' usage counts
  formEventsTableId: "form_events",
  // The tuning and service log
  serviceLogTableId: "service_log",
  // The bucket the piano and profile photos are in
  storageId: "66b26b77003445e612b4",
};
