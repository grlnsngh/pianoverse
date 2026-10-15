/**
 * The terms printed in section 4 of the two rental agreements, as plain text
 * so they are easy to change. The hotel terms are the owner's, from his
 * "TPS 2" agreement; the private-person terms are the same adapted for one
 * person (see Decisions in docs/redesign/PLAN.md, Batch 30 and 31).
 *
 * How to write them:
 * - A blank line starts a new paragraph.
 * - **Title:** at the start of a paragraph is printed in bold.
 * - {business} prints the business name, or a line to write it on.
 * - {blank} prints a line to write on; {blank 90} makes it 90 wide (120 is the usual).
 * - A line that is only "--- page 2 ---" moves what follows to the second page.
 *
 * After a change, save the PDF once and check that nothing is cut off at the
 * bottom of either page (the test in __tests__/agreements.test.ts warns when a
 * page gets much longer than it was). An over-the-air update carries it.
 */

export const HOTEL_TERMS = `
**Payment:** The monthly rental of ₹{blank 90} plus GST shall be payable in the first week of each month.

**Late payment:** Any monthly rental not received within the first week of the month shall attract interest at 1.5% per month (18% per annum) on the overdue amount, calculated daily from the due date until payment. GST shall apply on late payment charges as applicable.

**Ownership:** The piano shall remain the sole property of {business}. This agreement does not transfer ownership to the client.

**Care and maintenance:** The client shall take reasonable care of the piano and keep it in a suitable environment, away from moisture, direct sunlight, excessive heat and other conditions that may cause damage.

--- page 2 ---

**Damage:** Any damage caused by negligence, misuse, unauthorized shifting or improper handling shall be the client’s responsibility, excluding normal wear and tear.

**Shifting:** The piano shall not be moved from the agreed installation location without prior written permission from {business}.

**Maintenance and tuning:** Routine maintenance and tuning shall be arranged by mutual agreement. Any additional repairs required due to misuse or accidental damage shall be chargeable to the client.

**Termination and return:** Either party may terminate this agreement before the end of the rental period by giving one (1) month’s prior written notice. Upon termination or expiry of the rental period, the client shall provide access for the piano’s collection and return it in the condition in which it was delivered, allowing for normal wear and tear.

**Extension:** Any extension beyond {blank} shall require mutual written agreement on the revised rental period and charges.

**Delivery and collection:** Delivery, installation and collection arrangements shall be as mutually agreed between both parties.
`;

export const PRIVATE_TERMS = `
**Payment:** The monthly rental of ₹{blank 90} shall be payable in the first week of each month.

**Late payment:** Any monthly rental not received within the first week of the month shall attract simple interest at 1% per month (12% per annum) on the overdue amount, calculated daily from the due date until payment.

**Ownership:** The piano shall remain the sole property of {business}. This agreement does not transfer ownership to the renter.

**Care and maintenance:** The renter shall take reasonable care of the piano and keep it in a suitable environment, away from moisture, direct sunlight, excessive heat and other conditions that may cause damage.

--- page 2 ---

**Damage:** Any damage caused by negligence, misuse, unauthorized shifting or improper handling shall be the renter’s responsibility, excluding normal wear and tear.

**Shifting:** The piano shall not be moved from the address in this agreement without prior written permission from {business}.

**Maintenance and tuning:** Routine maintenance and tuning shall be arranged by mutual agreement. Any additional repairs required due to misuse or accidental damage shall be chargeable to the renter.

**Security deposit:** The security deposit shall be refunded within 15 days of the piano’s return, after deducting any unpaid rent and any charges for damage under these terms.

**Termination and return:** Either party may terminate this agreement before the end of the rental period by giving one (1) month’s prior written notice. Upon termination or expiry of the rental period, the renter shall provide access for the piano’s collection and return it in the condition in which it was delivered, allowing for normal wear and tear.

**Extension:** Any extension beyond {blank} shall require mutual written agreement on the revised rental period and charges.

**Delivery and collection:** Delivery, installation and collection arrangements shall be as mutually agreed between both parties.
`;
