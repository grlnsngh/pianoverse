jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
import { addMonths, startOfMonth, subDays } from "date-fns";
import { getRentPaymentsBetween, RentPayment } from "@/lib/appwrite";
import { toStoredDate } from "@/utils/dates";
import { totalReceived } from "@/utils/stats";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { testUser } from "./helpers/fixtures";

const firstOfMonth = startOfMonth(new Date());
const lastOfLastMonth = subDays(firstOfMonth, 1);
const firstOfNextMonth = addMonths(firstOfMonth, 1);

const seedPayment = (
  id: string,
  paidOn: Date,
  amount: number,
  extra: Record<string, unknown> = {}
) =>
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: "piano-1",
    creator: testUser.accountId,
    amount,
    paid_on: toStoredDate(paidOn),
    ...extra,
  });

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("what has been received", () => {
  const payment = (amount: number) => ({ amount }) as RentPayment;

  it("is the payments added up, and how many there are", () => {
    expect(totalReceived([payment(4000), payment(2500.5)])).toEqual({
      count: 2,
      total: 6500.5,
    });
    expect(totalReceived([])).toEqual({ count: 0, total: 0 });
  });
});

describe("finding an owner's payments in a period", () => {
  it("includes the first day and leaves out the day the period ends on", async () => {
    seedPayment("first-day", firstOfMonth, 1000);
    seedPayment("last-day", subDays(firstOfNextMonth, 1), 2000);
    seedPayment("before", lastOfLastMonth, 4000);
    seedPayment("after", firstOfNextMonth, 8000);

    const found = await getRentPaymentsBetween(
      testUser.accountId,
      firstOfMonth,
      firstOfNextMonth
    );

    expect(found.map((payment) => payment.$id).sort()).toEqual([
      "first-day",
      "last-day",
    ]);
  });

  it("leaves out other owners' payments", async () => {
    seedPayment("mine", firstOfMonth, 1000);
    seedPayment("theirs", firstOfMonth, 9000, { creator: "account-2" });

    const found = await getRentPaymentsBetween(
      testUser.accountId,
      firstOfMonth,
      firstOfNextMonth
    );

    expect(found.map((payment) => payment.$id)).toEqual(["mine"]);
  });

  it("finds every payment, not just the first page", async () => {
    for (let i = 0; i < 130; i++) seedPayment(`p-${i}`, firstOfMonth, 1);

    const found = await getRentPaymentsBetween(
      testUser.accountId,
      firstOfMonth,
      firstOfNextMonth
    );

    expect(found).toHaveLength(130);
  });
});
