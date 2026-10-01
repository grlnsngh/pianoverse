jest.mock("@/lib/appwrite", () => ({
  getRentPaymentsBetween: jest.fn(),
}));

import React from "react";
import { act } from "react-test-renderer";
import { Provider } from "react-redux";
import { getRentPaymentsBetween } from "@/lib/appwrite";
import useTodayPayments, { TodayPayments } from "@/lib/useTodayPayments";
import { paymentsChanged } from "@/redux/payments/actions";
import { setPianoListItems } from "@/redux/pianos/actions";
import { makePiano, testUser } from "./helpers/fixtures";
import { mount } from "./helpers/ui";
import { createTestStore } from "./helpers/render";

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
  jest.clearAllMocks();
  jest.mocked(getRentPaymentsBetween).mockResolvedValue([]);
});
afterEach(() => {
  jest.useRealTimers();
});

const payment = (id: string, amount = 100) => ({
  $id: id,
  $createdAt: "2026-09-01T10:00:00.000+00:00",
  piano_id: "piano-1",
  creator: testUser.accountId,
  amount,
  paid_on: "2026-09-01",
});

const open = async (user: any = testUser) => {
  const store = createTestStore({ user });
  let latest!: TodayPayments;
  const Probe = () => {
    latest = useTodayPayments();
    return null;
  };
  await mount(
    <Provider store={store}>
      <Probe />
    </Provider>
  );
  return { store, result: () => latest };
};

const deferred = () => {
  let resolve!: (value: any[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any[]>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

describe("useTodayPayments", () => {
  it("loads the payments and says so", async () => {
    jest.mocked(getRentPaymentsBetween).mockResolvedValue([payment("a"), payment("b")]);

    const { result } = await open();

    expect(result().loaded).toBe(true);
    expect(result().failed).toBe(false);
    expect(result().payments.map((p) => p.$id)).toEqual(["a", "b"]);
  });

  it("isn't loaded until the answer comes", async () => {
    const slow = deferred();
    jest.mocked(getRentPaymentsBetween).mockReturnValue(slow.promise as any);

    const { result } = await open();
    expect(result().loaded).toBe(false);
    expect(result().payments).toEqual([]);

    await act(async () => {
      slow.resolve([payment("a")]);
    });
    expect(result().loaded).toBe(true);
  });

  it("asks for the owner's payments from the start of last month to the end of this one", async () => {
    await open();

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(1);
    const [account, from, to] = jest.mocked(getRentPaymentsBetween).mock.calls[0];
    expect(account).toBe(testUser.accountId);
    expect(from).toEqual(new Date(2026, 7, 1));
    expect(to).toEqual(new Date(2026, 9, 1));
  });

  it("is loaded, with nothing, and asks for nothing when nobody is signed in", async () => {
    const { result } = await open(null);

    expect(getRentPaymentsBetween).not.toHaveBeenCalled();
    expect(result().loaded).toBe(true);
    expect(result().failed).toBe(false);
    expect(result().payments).toEqual([]);
  });

  it("says it failed when the very first load does", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.mocked(getRentPaymentsBetween).mockRejectedValue(new Error("Network request failed"));

    const { result } = await open();

    expect(result().loaded).toBe(true);
    expect(result().failed).toBe(true);
    expect(result().payments).toEqual([]);
  });

  it("keeps the payments it has, and doesn't say it failed, when a later load fails", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.mocked(getRentPaymentsBetween).mockResolvedValueOnce([payment("a")]);
    const { result } = await open();
    jest.mocked(getRentPaymentsBetween).mockRejectedValueOnce(new Error("Network request failed"));

    await act(async () => {
      await result().reload();
    });

    expect(result().failed).toBe(false);
    expect(result().payments.map((p) => p.$id)).toEqual(["a"]);
  });

  it("loads again when a payment is added or deleted", async () => {
    const { store } = await open();
    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(1);

    await act(async () => {
      store.dispatch(paymentsChanged());
    });

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(2);
  });

  it("loads again when the number of pianos changes, since deleting one deletes its payments", async () => {
    const { store } = await open();

    await act(async () => {
      store.dispatch(setPianoListItems([makePiano({ $id: "one" }), makePiano({ $id: "two" })]));
    });

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(2);
  });

  it("gives the newest answer when an older one arrives late", async () => {
    const first = deferred();
    const second = deferred();
    jest.mocked(getRentPaymentsBetween).mockReturnValueOnce(first.promise as any).mockReturnValueOnce(second.promise as any);
    const { store, result } = await open();
    await act(async () => {
      store.dispatch(paymentsChanged());
    });

    await act(async () => {
      second.resolve([payment("new")]);
    });
    await act(async () => {
      first.resolve([payment("old")]);
    });

    expect(result().payments.map((p) => p.$id)).toEqual(["new"]);
  });

  it("reloads on request, and says when that has finished", async () => {
    jest.mocked(getRentPaymentsBetween).mockResolvedValueOnce([payment("a")]);
    const { result } = await open();
    const slow = deferred();
    jest.mocked(getRentPaymentsBetween).mockReturnValueOnce(slow.promise as any);

    let finished = false;
    await act(async () => {
      result().reload().then(() => {
        finished = true;
      });
    });
    expect(finished).toBe(false);

    await act(async () => {
      slow.resolve([payment("a"), payment("b")]);
    });

    expect(finished).toBe(true);
    expect(result().payments.map((p) => p.$id)).toEqual(["a", "b"]);
  });
});
