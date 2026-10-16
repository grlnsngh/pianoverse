/**
 * The owner's own UPI ID (Edit profile), put in a rent reminder so the renter
 * knows where to pay. It is only ever the owner's own, and only added when they
 * entered one: the app sends nobody else's.
 *
 * A UPI ID (a "VPA") is a name, an @ and the bank's or app's handle, like
 * name@oksbi or 9876543210@ybl: letters, digits, dots, dashes and underscores
 * before the @, and letters (with the odd digit or dot) after it. The apps check
 * a real one when someone pays; this only stops what can't be one.
 */

/** The longest UPI ID the app keeps: the size of its column in Appwrite. */
export const MAX_UPI_ID = 100;

/** A UPI ID as it is saved: no spaces at all (it never has any). */
export const cleanUpiId = (value: string) => value.replace(/\s+/g, "");

const UPI_ID = /^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9.]{1,63}$/;

/** Whether this reads as a UPI ID. */
export const isUpiId = (value: string | null | undefined) => {
  const id = cleanUpiId(value ?? "");
  return id.length <= MAX_UPI_ID && UPI_ID.test(id);
};

/** What is wrong with a UPI ID, in words for under the field, or "" (an empty one is fine: it leaves the line out). */
export const upiIdError = (value: string) => {
  const id = cleanUpiId(value);
  if (!id) return "";
  return isUpiId(id) ? "" : "Enter a UPI ID like name@bank.";
};

/** The UPI ID to put in a reminder: the signed-in owner's own, when they entered one that reads as a UPI ID; otherwise nothing. */
export const reminderUpiId = (user: { upi_id?: string | null } | null | undefined): string | null =>
  user?.upi_id && isUpiId(user.upi_id) ? cleanUpiId(user.upi_id) : null;
