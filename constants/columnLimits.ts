/**
 * The longest text each field can save: the size of its column in Appwrite
 * (appwrite/project.json, which `appwriteSchema.test.ts` checks these
 * against). A field takes no more than that, so a long entry stops as it is
 * typed instead of failing to save with Appwrite's error.
 */
export const COLUMN_LIMITS = {
  pianos: {
    title: 255,
    description: 1020,
    rental_customer_name: 255,
    rental_customer_address: 255,
    rental_customer_mobile: 20,
    event_purchase_from: 255,
    event_model_number: 255,
    event_b_number: 255,
    on_sale_purchase_from: 255,
    sold_to_name: 255,
    sold_to_address: 255,
  },
  rent_payments: {
    customer_name: 255,
  },
  service_log: {
    note: 1000,
  },
} as const;
