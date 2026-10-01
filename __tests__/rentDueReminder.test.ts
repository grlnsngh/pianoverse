import { buildReminderMessage, needsReminder } from "@/utils/reminders";
import type { RentBalance } from "@/utils/rentDue";
import { makePiano } from "./helpers/fixtures";

/** The reminder when rent is due: it says how much, and asks for it. Today is 29 September 2026. */

const today = new Date(2026, 8, 29);

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

const lines = (message: string) => message.split("\n");

describe("the reminder when rent is due", () => {
  it("for a rental that is running says how much is due, and asks for the payment", () => {
    const message = buildReminderMessage(rental("2026-12-01"), today, owing());

    expect(lines(message)[2]).toBe(
      "This is a note about your rental of Kawai K-300, which runs until 1 Dec 2026. The rent is ₹4,000. ₹8,000 of the rent is due (2 months, since 1 Aug 2026). Please arrange the payment."
    );
  });

  it("for a rental ending within the week asks for the payment or an extension", () => {
    const message = buildReminderMessage(rental("2026-10-02"), today, owing());

    expect(lines(message)[2]).toBe(
      "Your rental of Kawai K-300 ends on 2 Oct 2026 (in 3 days). The rent is ₹4,000. ₹8,000 of the rent is due (2 months, since 1 Aug 2026). Please arrange the payment, or let us know if you would like to extend it."
    );
  });

  it("for a rental that ends today does the same", () => {
    const message = buildReminderMessage(rental("2026-09-29"), today, owing());

    expect(lines(message)[2]).toBe(
      "Your rental of Kawai K-300 ends today. The rent is ₹4,000. ₹8,000 of the rent is due (2 months, since 1 Aug 2026). Please arrange the payment, or let us know if you would like to extend it."
    );
  });

  it("for a rental that has ended says how much is due before the ask", () => {
    const message = buildReminderMessage(rental("2026-09-19"), today, owing());

    expect(lines(message)[2]).toBe(
      "Your rental of Kawai K-300 ended on 19 Sep 2026. The rent is ₹4,000. ₹8,000 of the rent is due (2 months, since 1 Aug 2026). Please arrange the payment, or let us know if you would like to extend the rental."
    );
  });

  it("says 1 month, not 1 months, and leaves out the day when there is none", () => {
    const message = buildReminderMessage(
      rental("2026-12-01"),
      today,
      owing({ due: 4000, monthsDue: 1, since: null })
    );

    expect(message).toContain("₹4,000 of the rent is due (1 month).");
  });

  it("is the same as without a balance when nothing is due", () => {
    const piano = rental("2026-12-01");
    const plain = buildReminderMessage(piano, today);

    expect(buildReminderMessage(piano, today, null)).toBe(plain);
    expect(buildReminderMessage(piano, today, owing({ due: 0, monthsDue: 0, since: null }))).toBe(
      plain
    );
    expect(plain).not.toContain("due");
  });

  it("keeps the greeting and the thanks", () => {
    const message = buildReminderMessage(rental("2026-12-01"), today, owing());

    expect(lines(message)[0]).toBe("Hello Asha Mehta,");
    expect(lines(message).slice(-1)[0]).toBe("Thank you.");
  });
});

describe("when a reminder is worth sending", () => {
  it("is when rent is due, even with weeks to go", () => {
    expect(needsReminder(rental("2026-12-01"), today)).toBe(false);
    expect(needsReminder(rental("2026-12-01"), today, owing())).toBe(true);
  });

  it("isn't when nothing is due and the rental has weeks to go", () => {
    expect(needsReminder(rental("2026-12-01"), today, owing({ due: 0 }))).toBe(false);
  });

  it("still is for a rental that is ending, whatever it owes", () => {
    expect(needsReminder(rental("2026-10-02"), today, owing({ due: 0 }))).toBe(true);
  });

  it("isn't without a number to message", () => {
    expect(
      needsReminder(rental("2026-12-01", { rental_customer_mobile: "" }), today, owing())
    ).toBe(false);
  });
});
