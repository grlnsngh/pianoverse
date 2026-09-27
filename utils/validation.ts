import { differenceInCalendarDays } from "date-fns";

/**
 * The 10-digit Indian mobile number in what the user typed, or null. Spaces,
 * dashes and a +91 or leading 0 are allowed: "+91 98765 43210",
 * "098765-43210" and "9876543210" are all 9876543210.
 */
export const toNationalMobile = (mobile: string): string | null => {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return null;
};

/** Why a rental can't be saved as entered, or null if it's fine. */
export const rentalDetailsError = ({
  mobile,
  startDate,
  endDate,
}: {
  mobile: string;
  startDate: Date;
  endDate: Date;
}) => {
  if (!toNationalMobile(mobile)) {
    return "Please enter a 10-digit mobile number.";
  }
  if (differenceInCalendarDays(endDate, startDate) < 1) {
    return "The rental end date must be after the start date.";
  }
  return null;
};
