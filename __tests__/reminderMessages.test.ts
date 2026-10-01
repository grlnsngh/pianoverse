import { listActions } from "@/utils/pianoDetail";
import { toStoredDate } from "@/utils/dates";
import {
  buildReceiptMessage,
  buildReminderMessage,
  canRemind,
  needsReminder,
  receiptNumber,
} from "@/utils/reminders";
import { makePiano } from "./helpers/fixtures";

/**
 * The messages the owner sends a renter. Today is fixed at 1 October 2026 so
 * "ended", "ends in 3 days" and "runs until" don't depend on the day the tests
 * are run.
 */

const today = new Date(2026, 9, 1);
const stored = (month: number, day: number) =>
  toStoredDate(new Date(2026, month, day)) as any;

const rental = (end: ReturnType<typeof stored> | undefined, extra = {}) =>
  makePiano({
    $id: "piano-1",
    title: "Kawai K-300",
    category: "rentable",
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "9876543210",
    rental_period_start: stored(8, 1),
    rental_period_end: end,
    rental_price: 4000,
    ...extra,
  });

describe("the reminder", () => {
  it("says a rental that has ended is due, with what to do", () => {
    expect(buildReminderMessage(rental(stored(8, 28)), today)).toBe(
      [
        "Hello Asha Mehta,",
        "",
        "Your rental of Kawai K-300 ended on 28 Sep 2026. The rent is ₹4,000. Please arrange the payment, or let us know if you would like to extend the rental.",
        "",
        "Thank you.",
      ].join("\n")
    );
  });

  it("says a rental that ends today ends today", () => {
    expect(buildReminderMessage(rental(stored(9, 1)), today)).toContain(
      "Your rental of Kawai K-300 ends today. The rent is ₹4,000. Please let us know if you would like to extend it."
    );
  });

  it("counts the days of a rental that ends soon, in the singular too", () => {
    expect(buildReminderMessage(rental(stored(9, 4)), today)).toContain(
      "ends on 4 Oct 2026 (in 3 days)."
    );
    expect(buildReminderMessage(rental(stored(9, 2)), today)).toContain(
      "ends on 2 Oct 2026 (in 1 day)."
    );
    // The last day that still counts as soon
    expect(buildReminderMessage(rental(stored(9, 8)), today)).toContain(
      "(in 7 days)"
    );
  });

  it("is only a note for a rental with a longer way to go", () => {
    expect(buildReminderMessage(rental(stored(10, 30)), today)).toContain(
      "This is a note about your rental of Kawai K-300, which runs until 30 Nov 2026. The rent is ₹4,000."
    );
  });

  it("copes with a rental that has no end date", () => {
    expect(buildReminderMessage(rental(undefined), today)).toContain(
      "This is a note about your rental of Kawai K-300. The rent is ₹4,000."
    );
  });

  it("leaves out the name, or the rent, when there is none", () => {
    const message = buildReminderMessage(
      rental(stored(8, 28), {
        rental_customer_name: "",
        rental_price: undefined,
      }),
      today
    );

    expect(message.startsWith("Hello,\n")).toBe(true);
    expect(message).not.toContain("The rent is");
    expect(message).toContain(
      "ended on 28 Sep 2026. Please arrange the payment"
    );
  });

  it("writes rupees the Indian way", () => {
    expect(
      buildReminderMessage(
        rental(stored(8, 28), { rental_price: 125000 }),
        today
      )
    ).toContain("The rent is ₹1,25,000.");
  });
});

describe("when a reminder can be sent", () => {
  it("needs a rental that isn't sold and a number to message", () => {
    expect(canRemind(rental(stored(9, 4)))).toBe(true);
    expect(
      canRemind(rental(stored(9, 4), { rental_customer_mobile: "  " }))
    ).toBe(false);
    expect(
      canRemind(rental(stored(9, 4), { rental_customer_mobile: undefined }))
    ).toBe(false);
    expect(canRemind(rental(stored(9, 4), { sold_date: stored(8, 20) }))).toBe(
      false
    );
    expect(canRemind(rental(stored(9, 4), { category: "on_sale" }))).toBe(
      false
    );
  });

  it("is offered with the button once the rental has ended or ends within a week", () => {
    expect(needsReminder(rental(stored(8, 28)), today)).toBe(true);
    expect(needsReminder(rental(stored(9, 1)), today)).toBe(true);
    expect(needsReminder(rental(stored(9, 8)), today)).toBe(true);
    expect(needsReminder(rental(stored(9, 9)), today)).toBe(false);
    expect(needsReminder(rental(undefined), today)).toBe(false);
    expect(
      needsReminder(
        rental(stored(8, 28), { rental_customer_mobile: "" }),
        today
      )
    ).toBe(false);
  });

  it("puts Remind customer first among a rental's actions, only with a number", () => {
    expect(listActions(rental(stored(9, 4)))).toEqual([
      "remind",
      "extend",
      "returned",
      "edit",
      "markSold",
      "delete",
    ]);
    expect(
      listActions(rental(stored(9, 4), { rental_customer_mobile: "" }))
    ).toEqual(["extend", "returned", "edit", "markSold", "delete"]);
  });
});

describe("the receipt", () => {
  const payment = {
    $id: "pay-1",
    $createdAt: "2026-09-29T10:00:00.000+00:00",
    piano_id: "piano-1",
    creator: "account-1",
    amount: 4000,
    paid_on: "2026-09-29",
    note: "UPI",
    customer_name: "Asha Mehta",
  };

  it("says what was received, from whom, when and for what", () => {
    expect(buildReceiptMessage(payment, rental(stored(9, 4)))).toBe(
      [
        "Payment receipt",
        "",
        "Received ₹4,000 from Asha Mehta on 29 Sep 2026.",
        "For the rent of Kawai K-300.",
        "Note: UPI",
        "",
        "Thank you.",
      ].join("\n")
    );
  });

  it("leaves out the name and the note when a payment has none", () => {
    const message = buildReceiptMessage(
      { ...payment, customer_name: null, note: null },
      rental(stored(9, 4))
    );

    expect(message).toContain("Received ₹4,000 on 29 Sep 2026.");
    expect(message).not.toContain("from");
    expect(message).not.toContain("Note:");
  });

  it("goes straight to the renter who paid, and to nobody else", () => {
    const piano = rental(stored(9, 4));

    expect(receiptNumber(payment, piano)).toBe("9876543210");
    // The same name in other capitals, with spaces round it
    expect(
      receiptNumber({ ...payment, customer_name: "  asha mehta " }, piano)
    ).toBe("9876543210");
    // The piano has been rented to someone else since
    expect(
      receiptNumber({ ...payment, customer_name: "Ravi Kumar" }, piano)
    ).toBeNull();
    // A payment recorded before names were saved can't be matched to anyone
    expect(
      receiptNumber({ ...payment, customer_name: undefined }, piano)
    ).toBeNull();
    // No number to send it to
    expect(
      receiptNumber(
        payment,
        rental(stored(9, 4), { rental_customer_mobile: "" })
      )
    ).toBeNull();
  });
});
