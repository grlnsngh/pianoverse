import type { RentalHistoryEntry } from "@/lib/appwrite";
import {
  changesOf,
  draftOf,
  draftProblem,
  hasChanges,
  rentalLabel,
  type RentalDraft,
} from "@/utils/rentalHistoryEdit";

/** Fixing a kept rental: what the sheet starts from, what differs, and what can't be saved. */

const kept = (extra: Partial<RentalHistoryEntry> = {}): RentalHistoryEntry => ({
  $id: "h1",
  $createdAt: "2026-06-01T00:00:00.000+00:00",
  piano_id: "piano-1",
  creator: "account-1",
  closed_on: "2026-06-01",
  ...extra,
});

const full = kept({
  customer_name: "Ravi Kumar",
  customer_mobile: "98765 43210",
  customer_address: "12 MG Road",
  period_start: "2026-02-01",
  period_end: "2026-05-31",
  price: 3500,
  reason: "replaced",
});

describe("the sheet's starting point", () => {
  it("is the rental as it was kept", () => {
    expect(draftOf(full)).toEqual({
      name: "Ravi Kumar",
      mobile: "98765 43210",
      address: "12 MG Road",
      start: new Date(2026, 1, 1),
      end: new Date(2026, 4, 31),
      price: 3500,
    });
  });

  it("has nothing for what was kept without", () => {
    expect(draftOf(kept())).toEqual({ name: "", mobile: "", address: "", start: null, end: null, price: 0 });
  });
});

describe("what differs", () => {
  const same = (): RentalDraft => draftOf(full);

  it("is nothing when nothing changed", () => {
    expect(changesOf(full, same())).toEqual({});
    expect(hasChanges(changesOf(full, same()))).toBe(false);
  });

  it("is only what was changed", () => {
    expect(changesOf(full, { ...same(), price: 4000 })).toEqual({ price: 4000 });
    expect(changesOf(full, { ...same(), address: " 14 Model Town " })).toEqual({ customerAddress: "14 Model Town" });
    expect(changesOf(full, { ...same(), end: new Date(2026, 4, 15) })).toEqual({ periodEnd: new Date(2026, 4, 15) });
    expect(changesOf(full, { ...same(), start: new Date(2026, 0, 20), mobile: "9123456789" })).toEqual({
      periodStart: new Date(2026, 0, 20),
      customerMobile: "9123456789",
    });
  });

  it("takes a name's extra spaces as no change, and a corrected name as one", () => {
    expect(changesOf(full, { ...same(), name: "  Ravi   Kumar " })).toEqual({});
    expect(changesOf(full, { ...same(), name: "Ravi Kumar Singh" })).toEqual({ customerName: "Ravi Kumar Singh" });
  });

  it("takes a detail off when it is emptied, and the rent when it is 0", () => {
    expect(changesOf(full, { ...same(), name: "", mobile: "", address: "", price: 0 })).toEqual({
      customerName: "",
      customerMobile: "",
      customerAddress: "",
      price: null,
    });
  });

  it("takes a date as the same when it is the same day, and sets one that was missing", () => {
    expect(changesOf(full, { ...same(), start: new Date(2026, 1, 1, 18, 30) })).toEqual({});
    expect(changesOf(kept(), { ...draftOf(kept()), end: new Date(2026, 5, 1) })).toEqual({ periodEnd: new Date(2026, 5, 1) });
  });
});

describe("what can't be saved as entered", () => {
  const draft = (changes: Partial<RentalDraft> = {}): RentalDraft => ({ ...draftOf(full), ...changes });

  it("is fine as it was, and with the details left empty", () => {
    expect(draftProblem(draft())).toBeNull();
    expect(draftProblem(draft({ name: "", mobile: "", address: "", start: null, end: null, price: 0 }))).toBeNull();
  });

  it("wants a number that is there to be a number: 10 digits, or one with its own country code", () => {
    expect(draftProblem(draft({ mobile: "98765" }))).toBe("Please enter a 10-digit mobile number, or leave it empty.");
    expect(draftProblem(draft({ mobile: "+91 98765 43210" }))).toBeNull();
    expect(draftProblem(draft({ mobile: "+44 7700 900123" }))).toBeNull();
    expect(draftProblem(draft({ mobile: "09876543210" }))).toBeNull();
  });

  it("won't have a rental end before it started, but lets it end the day it started", () => {
    expect(draftProblem(draft({ start: new Date(2026, 5, 15), end: new Date(2026, 4, 31) }))).toBe(
      "The end date can’t be before the start date."
    );
    expect(draftProblem(draft({ start: new Date(2026, 4, 31), end: new Date(2026, 4, 31) }))).toBeNull();
    expect(draftProblem(draft({ start: null, end: new Date(2020, 0, 1) }))).toBeNull();
  });
});

describe("what a kept rental is called", () => {
  it("is the customer and the dates", () => {
    expect(rentalLabel(full)).toBe("Ravi Kumar, 1 Feb 2026 to 31 May 2026");
  });

  it("is Someone when it has no name, and falls back to the day it was kept when it has no dates", () => {
    expect(rentalLabel(kept({ period_start: "2026-02-01", period_end: "2026-05-31" }))).toBe(
      "Someone, 1 Feb 2026 to 31 May 2026"
    );
    expect(rentalLabel(kept({ customer_name: "  Meera   Kapoor " }))).toBe("Meera Kapoor, Until 1 Jun 2026");
  });
});
