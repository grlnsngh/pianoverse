/** An amount in rupees with Indian digit grouping, e.g. ₹12,50,000. */
export const formatRupees = (amount: number) =>
  `₹${amount.toLocaleString("en-IN")}`;
