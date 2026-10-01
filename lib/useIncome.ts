import useOwnerPayments, { OwnerPayments } from "@/lib/useOwnerPayments";

export type IncomePayments = OwnerPayments;

/**
 * The rent payments the signed-in user recorded in the last `months` months,
 * for the income chart and list; the sales come from the pianos in redux.
 */
const useIncome = (months: number): IncomePayments => useOwnerPayments(months);

export default useIncome;
