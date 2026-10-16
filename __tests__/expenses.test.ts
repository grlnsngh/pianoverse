import { createEmptyPianoForm, pianoToForm, hasEntries, toPianoEntryInput } from "@/utils/pianoForm";
import {
  allCosts,
  categoryOf,
  costIcon,
  costLine,
  costsBetween,
  costsByKind,
  costsByMonth,
  costTitle,
  costTotal,
  EXPENSE_CATEGORIES,
  isExpenseCategory,
  newestFirst,
  type Expense,
} from "@/utils/expenses";
import {
  formatSigned,
  incomeByMonth,
  nothingRecorded,
  profitChartSummary,
  profitDetail,
  profitTotals,
  withCosts,
} from "@/utils/income";
import { convertCostsToCSV, COST_HEADERS } from "@/utils/ledgerCsv";
import { pianoMoney, profitIfSold, purchasePriceOf } from "@/utils/pianoMoney";
import type { ServiceEntry } from "@/utils/serviceLog";
import { makePiano } from "./helpers/fixtures";

const { loadProject, rowProblem } = jest.requireActual("../scripts/appwriteSchema");

/** Expenses, profit and each piano's money (canvas page "Expenses and profit"). */

const expense = (id: string, spentOn: string, amount: number, category: string, note: string | null = null): Expense => ({
  $id: id,
  $createdAt: `${spentOn}T10:00:00.000+00:00`,
  creator: "account-1",
  spent_on: spentOn,
  amount,
  category,
  note,
});
const service = (id: string, servicedOn: string, cost: number | null, kind = "tuning", pianoId = "kawai", note: string | null = null): ServiceEntry => ({
  $id: id,
  $createdAt: `${servicedOn}T11:00:00.000+00:00`,
  piano_id: pianoId,
  creator: "account-1",
  serviced_on: servicedOn,
  kind,
  cost,
  note,
});
const kawai = makePiano({ $id: "kawai", title: "Kawai K-300", category: "rentable" });

describe("the kinds of expense", () => {
  it("are the five the owner chose, each with an icon", () => {
    expect(EXPENSE_CATEGORIES.map((option) => option.label)).toEqual([
      "Shop and storage",
      "Staff",
      "Transport",
      "Advertising",
      "Other",
    ]);
    expect(EXPENSE_CATEGORIES.map((option) => option.icon)).toEqual(["shop", "tabAccount", "truck", "megaphone", "more"]);
  });

  it("knows its own, and treats one it doesn't know as Other", () => {
    expect(isExpenseCategory("staff")).toBe(true);
    expect(isExpenseCategory("salary")).toBe(false);
    expect(categoryOf("salary").label).toBe("Other");
    expect(categoryOf("transport").label).toBe("Transport");
  });

  it("puts the newest first, the one recorded later first on the same day", () => {
    const a = expense("a", "2026-09-01", 1, "shop");
    const b = { ...expense("b", "2026-09-01", 1, "shop"), $createdAt: "2026-09-01T12:00:00.000+00:00" };
    const c = expense("c", "2026-08-01", 1, "shop");
    expect(newestFirst([c, a, b]).map((item) => item.$id)).toEqual(["b", "a", "c"]);
  });
});

describe("the costs", () => {
  const costs = allCosts(
    [expense("e1", "2026-09-01", 2000, "shop", "Shop rent, September"), expense("e0", "2026-09-03", 0, "other")],
    [service("s1", "2026-09-12", 1200), service("s2", "2026-09-20", null, "cleaning"), service("s3", "2026-08-05", 2500, "moving", "gone")],
    [kawai]
  );

  it("are the expenses and the services that cost something, the newest first", () => {
    expect(costs.map((cost) => cost.id)).toEqual(["s1", "e1", "s3"]);
    expect(costTotal(costs)).toBe(5700);
  });

  it("name what each was: the expense's note or kind, the service and its piano", () => {
    expect(costs.map(costTitle)).toEqual(["Tuning · Kawai K-300", "Shop rent, September", "Moving · A piano"]);
    expect(costs.map((cost) => costLine(cost))).toEqual(["12 Sep · Piano service", "1 Sep · Shop and storage", "5 Aug · Piano service"]);
    expect(costLine(costs[1], true)).toBe("1 Sep 2026 · Shop and storage");
    expect(costs.map(costIcon)).toEqual(["tuningFork", "shop", "truck"]);
    const plain = allCosts([expense("e2", "2026-09-02", 500, "advertising")], [], []);
    expect(costTitle(plain[0])).toBe("Advertising");
  });

  it("are picked out for a stretch of days", () => {
    expect(costsBetween(costs, new Date(2026, 8, 1), new Date(2026, 9, 1)).map((cost) => cost.id)).toEqual(["s1", "e1"]);
  });

  it("add up by kind, the biggest first, every kind there even when nothing", () => {
    expect(costsByKind(costs)).toEqual([
      { key: "service", label: "Piano service", icon: "tuningFork", amount: 3700 },
      { key: "shop", label: "Shop and storage", icon: "shop", amount: 2000 },
      { key: "staff", label: "Staff", icon: "tabAccount", amount: 0 },
      { key: "transport", label: "Transport", icon: "truck", amount: 0 },
      { key: "advertising", label: "Advertising", icon: "megaphone", amount: 0 },
      { key: "other", label: "Other", icon: "more", amount: 0 },
    ]);
  });

  it("group by month, the newest month first, each with its total", () => {
    const months = costsByMonth(costs);
    expect(months.map((month) => [month.label, month.total, month.costs.map((cost) => cost.id)])).toEqual([
      ["September 2026", 3200, ["s1", "e1"]],
      ["August 2026", 2500, ["s3"]],
    ]);
    expect(months[0].month).toEqual(new Date(2026, 8, 1));
  });
});

describe("profit by month", () => {
  const today = new Date(2026, 8, 29);
  const months = withCosts(
    incomeByMonth(
      [
        { amount: 5000, paid_on: "2026-09-25" },
        { amount: 3000, paid_on: "2026-08-28" },
      ],
      [makePiano({ $id: "sold", category: "on_sale", sold_date: "2026-09-10" as any, sold_price: 100000 })],
      3,
      today
    ),
    [
      { day: new Date(2026, 8, 12), amount: 1200 },
      { day: new Date(2026, 6, 5), amount: 6000 },
      { day: new Date(2026, 7, 1), amount: 2000 },
      { day: new Date(2025, 0, 1), amount: 999 },
    ]
  );

  it("takes each month's costs from what came in, and leaves out costs outside the months", () => {
    expect(months.map((month) => [month.total, month.costs, month.costCount, month.profit])).toEqual([
      [0, 6000, 1, -6000],
      [3000, 2000, 1, 1000],
      [105000, 1200, 1, 103800],
    ]);
    expect(profitTotals(months)).toEqual({ income: 108000, costs: 9200, profit: 98800 });
  });

  it("says what each month was made of", () => {
    expect(months.map(profitDetail)).toEqual([
      "₹0 in · ₹6,000 out",
      "₹3,000 in · ₹2,000 out",
      "₹1,05,000 in · ₹1,200 out · 1 piano sold",
    ]);
    const quiet = withCosts(incomeByMonth([], [], 1, today), []);
    expect(profitDetail(quiet[0])).toBe("Nothing recorded");
    expect(nothingRecorded(quiet)).toBe(true);
    expect(nothingRecorded(months)).toBe(false);
  });

  it("writes a loss with a minus", () => {
    expect(formatSigned(98800)).toBe("₹98,800");
    expect(formatSigned(-6000)).toBe("−₹6,000");
    expect(formatSigned(0)).toBe("₹0");
  });

  it("tells a screen reader the rent and costs of each month", () => {
    expect(profitChartSummary(months)).toBe(
      "Rent and costs by month. July 2026: rent ₹0, costs ₹6,000. August 2026: rent ₹3,000, costs ₹2,000. " +
        "September 2026: rent ₹5,000, 1 piano sold for ₹1,00,000, costs ₹1,200."
    );
  });
});

describe("what a piano was bought for", () => {
  it("is Bought for once saved, 0 meaning not known", () => {
    expect(purchasePriceOf({ purchase_price: 85000, event_purchase_price: 70000 })).toBe(85000);
    expect(purchasePriceOf({ purchase_price: 0, event_purchase_price: 70000 })).toBeNull();
  });

  it("is an events piano's Purchase price from before, until Bought for is saved", () => {
    expect(purchasePriceOf({ purchase_price: null, event_purchase_price: 780000 })).toBe(780000);
    expect(purchasePriceOf({ event_purchase_price: 0 })).toBeNull();
    expect(purchasePriceOf({})).toBeNull();
  });
});

describe("a piano's money", () => {
  const payments = [{ amount: 4500 }, { amount: 4500 }];
  const entries = [service("s1", "2026-04-04", 1200), service("s2", "2026-02-02", null, "cleaning")];

  it("is the rent it earned, less what it was bought for and its services", () => {
    const money = pianoMoney(makePiano({ purchase_price: 5000, date_of_purchase: "2023-08-14" as any }), payments, entries);
    expect(money).toEqual({
      rent: 9000,
      rentCount: 2,
      sale: 0,
      earned: 9000,
      bought: 5000,
      service: 1200,
      serviceCount: 2,
      costs: 6200,
      profit: 2800,
      since: new Date(2023, 7, 14),
    });
  });

  it("counts the sale of a sold piano", () => {
    const money = pianoMoney(
      makePiano({ purchase_price: 40000, sold_date: "2026-09-10" as any, sold_price: 120000 }),
      payments,
      entries
    );
    expect([money.sale, money.earned, money.profit]).toEqual([120000, 129000, 87800]);
  });

  it("has no profit until what it was bought for is known, and can be a loss", () => {
    expect(pianoMoney(makePiano({ purchase_price: null }), payments, []).profit).toBeNull();
    expect(pianoMoney(makePiano({ purchase_price: 50000 }), payments, entries).profit).toBe(-42200);
  });

  it("says what selling it would make", () => {
    const money = pianoMoney(makePiano({ purchase_price: 40000 }), [{ amount: 108000 }], [service("s", "2026-01-01", 7900)]);
    expect(profitIfSold(money, 120000)).toBe(180100);
    expect(profitIfSold(pianoMoney(makePiano({ purchase_price: null }), [], []), 120000)).toBeNull();
  });
});

describe("Bought for in the piano form", () => {
  const user = { $id: "user-doc-1", accountId: "account-1" };

  it("is saved for every kind of piano, and an events piano's Purchase price follows it", () => {
    const rental = toPianoEntryInput({ ...createEmptyPianoForm(), category: "warehouse", purchasePrice: 85000 }, { user });
    expect(rental.purchase_price).toBe(85000);
    expect(rental).not.toHaveProperty("event_purchase_price");
    const events = toPianoEntryInput({ ...createEmptyPianoForm(), category: "events", purchasePrice: 780000 }, { user });
    expect([events.purchase_price, events.event_purchase_price]).toEqual([780000, 780000]);
  });

  it("is 0, not known, when left empty", () => {
    expect(toPianoEntryInput(createEmptyPianoForm(), { user }).purchase_price).toBe(0);
  });

  it("is filled in from the piano when editing, an events piano's old Purchase price too", () => {
    expect(pianoToForm(makePiano({ purchase_price: 85000 })).purchasePrice).toBe(85000);
    expect(pianoToForm(makePiano({ category: "events", event_purchase_price: 780000 })).purchasePrice).toBe(780000);
    expect(pianoToForm(makePiano({})).purchasePrice).toBe(0);
  });

  it("counts as something entered when leaving the Add flow", () => {
    expect(hasEntries({ ...createEmptyPianoForm(), purchasePrice: 1000 })).toBe(true);
  });
});

describe("the live tables", () => {
  const project = loadProject();
  const table = (name: string) => project.tables.find((candidate: { name: string }) => candidate.name === name);

  it("take what the app sends: a piano's Bought for, and an expense", () => {
    expect(rowProblem(table("pianos"), { purchase_price: 85000 }, { creating: false })).toBeNull();
    expect(
      rowProblem(
        table("expenses"),
        { creator: "account-1", spent_on: "2026-09-01", amount: 2000, category: "shop", note: "Shop rent" },
        { creating: true }
      )
    ).toBeNull();
  });

  it("refuse an expense with no amount, or a note longer than its column", () => {
    expect(rowProblem(table("expenses"), { creator: "a", spent_on: "2026-09-01", category: "shop" }, { creating: true })).not.toBeNull();
    expect(
      rowProblem(table("expenses"), { note: "x".repeat(1001) }, { creating: false })
    ).not.toBeNull();
  });
});

describe("the costs as CSV", () => {
  it("lists them oldest first: the day, the kind, what it was, the piano, the amount and when it was recorded", () => {
    const costs = allCosts(
      [expense("e1", "2026-09-01", 2000, "shop", "Shop rent"), expense("e2", "2026-09-03", 300, "other", "=SUM(A1)")],
      [service("s1", "2026-08-12", 1200, "tuning", "kawai", "Pitch raised")],
      [kawai]
    );

    expect(convertCostsToCSV(costs).split("\n")).toEqual([
      COST_HEADERS.join(","),
      "2026-08-12,Piano service,Tuning: Pitch raised,Kawai K-300,1200,2026-08-12",
      "2026-09-01,Shop and storage,Shop rent,,2000,2026-09-01",
      // A note that looks like a formula is kept as text
      "2026-09-03,Other,'=SUM(A1),,300,2026-09-03",
    ]);
  });
});
