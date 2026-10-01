import type { RentPayment } from "@/lib/appwrite";
import { changesOf, draftOf, hasChanges, monthMoveNote } from "@/utils/paymentEdit";

/** What changed on a payment that is being edited, and what the sheet says about it. */

const payment = (extra: Partial<RentPayment> = {}): RentPayment => ({
  $id: "p1",
  $createdAt: "2026-09-04T09:00:00.000+00:00",
  piano_id: "piano-1",
  creator: "account-1",
  amount: 4000,
  paid_on: "2026-09-03",
  note: "Cash",
  customer_name: "Asha Mehta",
  ...extra,
});

describe("the sheet's starting point", () => {
  it("is the payment as it was recorded", () => {
    expect(draftOf(payment())).toEqual({
      amount: 4000,
      paidOn: new Date(2026, 8, 3),
      name: "Asha Mehta",
      note: "Cash",
    });
  });

  it("has an empty name and note for a payment that has none", () => {
    expect(draftOf(payment({ note: null, customer_name: undefined }))).toMatchObject({ name: "", note: "" });
  });

  it("reads the day from any shape Appwrite gives it in", () => {
    expect(draftOf(payment({ paid_on: "2026-09-03T00:00:00.000+00:00" })).paidOn).toEqual(new Date(2026, 8, 3));
  });
});

describe("what changed", () => {
  const same = () => draftOf(payment());

  it("is nothing when nothing was touched", () => {
    expect(changesOf(payment(), same())).toEqual({});
    expect(hasChanges(changesOf(payment(), same()))).toBe(false);
  });

  it("is only the amount when only the amount changed", () => {
    expect(changesOf(payment(), { ...same(), amount: 4500 })).toEqual({ amount: 4500 });
  });

  it("is only the day when only the day changed, whatever the time on it", () => {
    const later = new Date(2026, 8, 3, 18, 30);
    expect(changesOf(payment(), { ...same(), paidOn: later })).toEqual({});

    expect(changesOf(payment(), { ...same(), paidOn: new Date(2026, 8, 5) })).toEqual({
      paidOn: new Date(2026, 8, 5),
    });
  });

  it("is only the name when only the name changed, with its spaces cleaned", () => {
    expect(changesOf(payment(), { ...same(), name: "  Asha   Mehata " })).toEqual({
      customerName: "Asha Mehata",
    });
  });

  it("is nothing for a name that only differs in spaces", () => {
    expect(changesOf(payment(), { ...same(), name: "  Asha   Mehta  " })).toEqual({});
  });

  it("takes the name off with an empty one", () => {
    expect(changesOf(payment(), { ...same(), name: "   " })).toEqual({ customerName: "" });
  });

  it("is only the note when only the note changed, and an empty one takes it off", () => {
    expect(changesOf(payment(), { ...same(), note: "UPI" })).toEqual({ note: "UPI" });
    expect(changesOf(payment(), { ...same(), note: "  " })).toEqual({ note: "" });
    expect(changesOf(payment(), { ...same(), note: " Cash " })).toEqual({});
  });

  it("gives a name to a payment that had none", () => {
    expect(changesOf(payment({ customer_name: null }), { ...draftOf(payment({ customer_name: null })), name: "Asha Mehta" })).toEqual({
      customerName: "Asha Mehta",
    });
  });

  it("is everything that changed, and hasChanges says so", () => {
    const changes = changesOf(payment(), {
      amount: 5000,
      paidOn: new Date(2026, 8, 1),
      name: "Ravi Kumar",
      note: "",
    });

    expect(changes).toEqual({
      amount: 5000,
      paidOn: new Date(2026, 8, 1),
      customerName: "Ravi Kumar",
      note: "",
    });
    expect(hasChanges(changes)).toBe(true);
  });
});

describe("moving a payment to another month", () => {
  it("says so, naming both months", () => {
    expect(monthMoveNote(payment(), new Date(2026, 7, 20))).toBe(
      "This moves the payment from September 2026 to August 2026, so the income for both months changes."
    );
    expect(monthMoveNote(payment({ paid_on: "2026-12-30" }), new Date(2027, 0, 2))).toBe(
      "This moves the payment from December 2026 to January 2027, so the income for both months changes."
    );
  });

  it("says nothing for another day in the same month", () => {
    expect(monthMoveNote(payment(), new Date(2026, 8, 25))).toBeNull();
    expect(monthMoveNote(payment(), new Date(2026, 8, 3))).toBeNull();
  });

  it("says nothing when the recorded day can't be read", () => {
    expect(monthMoveNote(payment({ paid_on: "" }), new Date(2026, 7, 20))).toBeNull();
  });
});
