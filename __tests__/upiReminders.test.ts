import {
  buildReceiptMessage,
  buildReminderMessage,
} from "@/utils/reminders";
import type { RentBalance } from "@/utils/rentDue";
import { cleanUpiId, isUpiId, MAX_UPI_ID, reminderUpiId, upiIdError } from "@/utils/upi";
import { makePiano } from "./helpers/fixtures";

/**
 * The owner's own UPI ID in a rent reminder (Batch 39): what reads as a UPI ID,
 * and where the line goes in the message. Today is 29 September 2026.
 */

const today = new Date(2026, 8, 29);
const UPI = "gurleen@oksbi";

const rental = (end: string, extra: Record<string, unknown> = {}) =>
  makePiano({
    $id: "kawai",
    title: "Kawai K-300",
    category: "rentable",
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "9876543210",
    rental_period_start: "2026-08-01" as any,
    rental_period_end: end as any,
    rental_price: 4000,
    ...extra,
  });

const owing = (extra: Partial<RentBalance> = {}): RentBalance => ({
  owed: 8000,
  paid: 0,
  due: 8000,
  monthsDue: 2,
  since: new Date(2026, 7, 1),
  ahead: 0,
  ...extra,
});
const settled = owing({ owed: 4000, paid: 4000, due: 0, monthsDue: 0, since: null });

const lines = (message: string) => message.split("\n");

describe("what reads as a UPI ID", () => {
  it.each([
    "gurleen@oksbi",
    "9876543210@ybl",
    "the.piano-services_1@okhdfcbank",
    "name@paytm",
    "A.B@Axl",
  ])("takes %s", (id) => {
    expect(isUpiId(id)).toBe(true);
    expect(upiIdError(id)).toBe("");
  });

  it.each([
    "gurleen",
    "@oksbi",
    "g@oksbi",
    "gurleen@",
    "gurleen@123",
    "gurleen@@oksbi",
    "gurleen#1@oksbi",
    "https://pay.me/gurleen",
    "9876543210",
  ])("refuses %s, and says what a UPI ID looks like", (id) => {
    expect(isUpiId(id)).toBe(false);
    expect(upiIdError(id)).toBe("Enter a UPI ID like name@bank.");
  });

  it("drops spaces, so a pasted one with a space at the end is still the same ID", () => {
    expect(cleanUpiId("  gurleen@oksbi \n")).toBe("gurleen@oksbi");
    expect(cleanUpiId("gur leen @ oksbi")).toBe("gurleen@oksbi");
    expect(isUpiId("  gurleen@oksbi ")).toBe(true);
  });

  it("leaves an empty one alone: it just leaves the line out", () => {
    expect(upiIdError("")).toBe("");
    expect(upiIdError("   ")).toBe("");
  });

  it("is never longer than its column", () => {
    expect(MAX_UPI_ID).toBe(100);
    expect(isUpiId(`${"a".repeat(64)}@${"b".repeat(40)}`)).toBe(false);
  });

  it("is the signed-in owner's own, and only when it reads as one", () => {
    expect(reminderUpiId({ upi_id: " gurleen@oksbi " })).toBe("gurleen@oksbi");
    expect(reminderUpiId({ upi_id: "not an id" })).toBeNull();
    expect(reminderUpiId({ upi_id: "" })).toBeNull();
    expect(reminderUpiId({ upi_id: null })).toBeNull();
    expect(reminderUpiId({})).toBeNull();
    expect(reminderUpiId(null)).toBeNull();
    expect(reminderUpiId(undefined)).toBeNull();
  });
});

describe("the reminder with the owner's UPI ID", () => {
  it("is exactly what it always was when the owner has none", () => {
    for (const end of ["2026-12-01", "2026-10-02", "2026-09-29", "2026-09-19"]) {
      for (const balance of [null, owing(), settled]) {
        expect(buildReminderMessage(rental(end), today, balance, null)).toBe(
          buildReminderMessage(rental(end), today, balance)
        );
        expect(buildReminderMessage(rental(end), today, balance, null)).not.toContain("UPI");
      }
    }
  });

  it("says where to pay, with how much, as its own paragraph, when rent is due on a running rental", () => {
    const message = buildReminderMessage(rental("2026-12-01"), today, owing(), UPI);

    expect(lines(message)).toEqual([
      "Hello Asha Mehta,",
      "",
      "This is a note about your rental of Kawai K-300, which runs until 1 Dec 2026. The rent is ₹4,000. ₹8,000 of the rent is due (2 months, since 1 Aug 2026). Please arrange the payment.",
      "",
      "You can pay ₹8,000 to UPI ID gurleen@oksbi.",
      "",
      "Thank you.",
    ]);
  });

  it("does the same when the rental ends within the week or today, where it asks for the payment or an extension", () => {
    for (const end of ["2026-10-02", "2026-09-29"]) {
      const message = lines(buildReminderMessage(rental(end), today, owing(), UPI));

      expect(message[2]).toContain("Please arrange the payment, or let us know if you would like to extend it.");
      expect(message.slice(3)).toEqual(["", "You can pay ₹8,000 to UPI ID gurleen@oksbi.", "", "Thank you."]);
    }
  });

  it("asks for what is due after a rental has ended, with the amount", () => {
    const message = lines(buildReminderMessage(rental("2026-09-19"), today, owing(), UPI));

    expect(message[2]).toContain("ended on 19 Sep 2026");
    expect(message[4]).toBe("You can pay ₹8,000 to UPI ID gurleen@oksbi.");
  });

  it("gives the UPI ID without an amount for an ended rental when nothing is known to be due", () => {
    for (const balance of [null, settled]) {
      const message = lines(buildReminderMessage(rental("2026-09-19"), today, balance, UPI));

      expect(message[2]).toContain("Please arrange the payment, or let us know if you would like to extend the rental.");
      expect(message[4]).toBe("You can pay to UPI ID gurleen@oksbi.");
    }
  });

  it("leaves it out when the message doesn't ask for a payment: only ending soon, or running, with nothing owed", () => {
    for (const end of ["2026-10-02", "2026-09-29", "2026-12-01"]) {
      for (const balance of [null, settled]) {
        const message = buildReminderMessage(rental(end), today, balance, UPI);

        expect(message).not.toContain("UPI");
        expect(message).toBe(buildReminderMessage(rental(end), today, balance));
      }
    }
  });

  it("leaves out the rent line's amount when there is none, but still asks where to pay what is due", () => {
    const message = buildReminderMessage(rental("2026-12-01", { rental_price: undefined }), today, owing(), UPI);

    expect(message).not.toContain("The rent is");
    expect(message).toContain("You can pay ₹8,000 to UPI ID gurleen@oksbi.");
  });
});

describe("the receipt", () => {
  it("never has a UPI ID: a receipt says money came in, not where to send it", () => {
    const receipt = buildReceiptMessage(
      { $id: "p", $createdAt: "", piano_id: "kawai", creator: "a", amount: 4000, paid_on: "2026-09-20", customer_name: "Asha Mehta" } as any,
      rental("2026-12-01")
    );

    expect(receipt).not.toContain("UPI ID");
  });
});
