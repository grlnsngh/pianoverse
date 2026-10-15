import { makePiano } from "./helpers/fixtures";
import {
  byYear,
  entriesFor,
  entryDay,
  intervalLabel,
  intervalOf,
  isServiceKind,
  kindOf,
  lastTuning,
  nextTuning,
  SERVICE_KINDS,
  serviceDetail,
  serviceDue,
  serviceDueLine,
  serviceHeadline,
  serviceMessage,
  serviceState,
  serviceSummary,
  TUNING_INTERVAL_OPTIONS,
  whereLine,
  type ServiceEntry,
} from "@/utils/serviceLog";

/** The tuning and service log's rules (canvas page "Tuning and service"). */

const TODAY = new Date(2026, 8, 29); // 29 Sep 2026

let seq = 0;
const entry = (pianoId: string, day: string, kind = "tuning", extra: Partial<ServiceEntry> = {}): ServiceEntry => ({
  $id: `s${++seq}`,
  $createdAt: `2026-01-01T00:00:${String(seq).padStart(2, "0")}.000+00:00`,
  piano_id: pianoId,
  creator: "account-1",
  serviced_on: day,
  kind,
  ...extra,
});

const rented = makePiano({ $id: "p1", title: "Young Chang U-121", category: "rentable", rental_customer_name: "Meera Kapoor", rental_customer_mobile: "9876543210" });
const warehouse = makePiano({ $id: "p2", title: "Kawai K-300", category: "warehouse" });

describe("the kinds and the intervals", () => {
  it("has the owner's five kinds, each with its icon", () => {
    expect(SERVICE_KINDS.map((option) => option.label)).toEqual(["Tuning", "Repair", "Cleaning", "Moving", "Other"]);
    expect(isServiceKind("moving")).toBe(true);
    expect(isServiceKind("polishing")).toBe(false);
    expect(kindOf("polishing").label).toBe("Other");
  });

  it("tunes every piano every 6 months until its own interval is set: 3, 6, 12 or none", () => {
    expect(TUNING_INTERVAL_OPTIONS.map((option) => option.months)).toEqual([3, 6, 12, 0]);
    expect(intervalOf({ tuning_interval_months: null })).toBe(6);
    expect(intervalOf({ tuning_interval_months: undefined })).toBe(6);
    expect(intervalOf({ tuning_interval_months: 3 })).toBe(3);
    expect(intervalOf({ tuning_interval_months: 0 })).toBe(0);
    // One the app doesn't offer counts as the default
    expect(intervalOf({ tuning_interval_months: 7 })).toBe(6);
    expect(intervalLabel(12)).toBe("Every 12 months");
    expect(intervalLabel(0)).toBe("No reminders");
  });
});

describe("when the next tuning is due", () => {
  it("is the last tuning plus the piano's interval; repairs, cleaning and moves don't count", () => {
    const log = [entry("p1", "2026-04-04"), entry("p1", "2026-06-10", "repair"), entry("p1", "2025-10-04"), entry("p1", "2026-08-01", "moving")];

    expect(lastTuning(log)).toEqual(new Date(2026, 3, 4));
    expect(nextTuning(rented, log)).toEqual(new Date(2026, 9, 4));
    expect(nextTuning({ ...rented, tuning_interval_months: 3 }, log)).toEqual(new Date(2026, 6, 4));
  });

  it("has none with no tuning logged, no reminders set, or once the piano is sold", () => {
    expect(nextTuning(rented, [entry("p1", "2026-04-04", "repair")])).toBeNull();
    expect(nextTuning({ ...rented, tuning_interval_months: 0 }, [entry("p1", "2026-04-04")])).toBeNull();
    expect(nextTuning({ ...rented, sold_date: new Date(2026, 5, 1) }, [entry("p1", "2026-04-04")])).toBeNull();
  });

  it("says how close it is, in the words of the boards", () => {
    const at = (day: string) => serviceState(rented, [entry("p1", day)], TODAY)!;

    expect(serviceHeadline(at("2026-04-04"))).toBe("Tuning due in 5 days");
    expect(serviceDetail(at("2026-04-04"))).toBe("Due 4 Oct 2026 · last tuned 4 Apr 2026");
    expect(serviceDueLine(at("2026-04-04"))).toBe("Tuning due in 5 days · 4 Oct");
    expect(serviceHeadline(at("2026-03-29"))).toBe("Tuning due today");
    expect(serviceHeadline(at("2026-03-30"))).toBe("Tuning due tomorrow");
    expect(at("2026-03-12").tone).toBe("late");
    expect(serviceHeadline(at("2026-03-12"))).toBe("Tuning overdue");
    expect(serviceDetail(at("2026-03-12"))).toBe("Was due 12 Sep 2026 · last tuned 12 Mar 2026");
    expect(serviceDueLine(at("2026-03-12"))).toBe("Tuning overdue · was due 12 Sep");
    expect(at("2026-06-01").tone).toBe("ok");
    expect(serviceHeadline(at("2026-06-01"))).toBe("Next tuning 1 Dec 2026");
    expect(serviceDetail(at("2026-06-01"))).toBe("Every 6 months · last tuned 1 Jun 2026");
  });
});

describe("Today's Service due", () => {
  it("lists tunings overdue or due within a week, the most overdue first, and leaves out the rest", () => {
    const soonPiano = makePiano({ $id: "p3", title: "Samick SU-118", category: "rentable" });
    const sold = makePiano({ $id: "p4", title: "Sold one", sold_date: new Date(2026, 5, 1) });
    const off = makePiano({ $id: "p5", title: "No reminders", tuning_interval_months: 0 });
    const log = [
      entry("p1", "2026-04-04"), // due in 5 days
      entry("p2", "2026-03-12"), // overdue
      entry("p3", "2026-06-01"), // not for a while
      entry("p4", "2026-01-01"),
      entry("p5", "2026-01-01"),
    ];

    const due = serviceDue([rented, warehouse, soonPiano, sold, off], log, TODAY);

    expect(due.map((item) => item.piano.title)).toEqual(["Kawai K-300", "Young Chang U-121"]);
  });

  it("says where each piano is", () => {
    expect(whereLine(rented)).toBe("Rented to Meera Kapoor");
    expect(whereLine(warehouse)).toBe("In the warehouse");
    expect(whereLine(makePiano({ category: "events" }))).toBe("For events");
    expect(whereLine(makePiano({ category: "on_sale" }))).toBe("On sale");
  });
});

describe("a piano's log", () => {
  it("keeps a piano's own entries, the newest first", () => {
    const log = [entry("p1", "2025-10-04"), entry("p2", "2026-05-01"), entry("p1", "2026-04-04")];

    expect(entriesFor(log, "p1").map((item) => item.serviced_on)).toEqual(["2026-04-04", "2025-10-04"]);
  });

  it("counts its services and what they cost", () => {
    expect(serviceSummary([entry("p1", "2026-04-04", "tuning", { cost: 1200 }), entry("p1", "2026-02-02", "moving", { cost: 2500 }), entry("p1", "2025-09-30", "cleaning")])).toEqual({
      count: 3,
      spent: 3700,
    });
  });

  it("groups them by year for the full list", () => {
    const groups = byYear([entry("p1", "2025-10-04"), entry("p1", "2026-04-04"), entry("p1", "2026-02-02", "moving")]);

    expect(groups.map((group) => [group.year, group.entries.map((item) => item.serviced_on)])).toEqual([
      ["2026", ["2026-04-04", "2026-02-02"]],
      ["2025", ["2025-10-04"]],
    ]);
    expect(entryDay(groups[0].entries[0])).toBe("4 Apr 2026");
    expect(entryDay(groups[0].entries[0], false)).toBe("4 Apr");
  });
});

describe("the message to the renter", () => {
  it("asks when to visit, and signs off with the business's name when there is one", () => {
    expect(serviceMessage(rented, new Date(2026, 9, 4), "The Piano Services", TODAY)).toBe(
      "Hello Meera Kapoor,\n\nYour piano, Young Chang U-121, is due for its tuning on 4 Oct 2026. When would be a good time for us to visit?\n\nThank you,\nThe Piano Services"
    );
    expect(serviceMessage({ ...rented, rental_customer_name: "" }, new Date(2026, 8, 29), "", TODAY)).toBe(
      "Hello,\n\nYour piano, Young Chang U-121, is due for its tuning today. When would be a good time for us to visit?\n\nThank you."
    );
    expect(serviceMessage(rented, new Date(2026, 8, 12), "", TODAY)).toContain("was due for its tuning on 12 Sep 2026");
  });
});
