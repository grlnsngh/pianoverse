jest.mock("@/lib/appwrite", () => ({
  getUserPianoEntries: jest.fn(),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import React from "react";
import { act } from "react-test-renderer";
import Home from "@/app/(tabs)/home";
import { getUserPianoEntries } from "@/lib/appwrite";
import { PianoData, PianoDataProvider, usePianoData } from "@/lib/PianoDataContext";
import { makePiano, testUser } from "./helpers/fixtures";
import { mount } from "./helpers/ui";
import { captureAlerts, createTestStore, flushPromises, renderWithStore } from "./helpers/render";
import { Provider } from "react-redux";

const weber = makePiano({ $id: "weber", title: "Weber W-121", category: "rentable" });
const estonia = makePiano({ $id: "estonia", title: "Estonia 190 Grand", category: "events" });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.mocked(getUserPianoEntries).mockResolvedValue([weber] as any);
});
afterEach(() => {
  jest.restoreAllMocks();
});

/** Home inside the provider, with a probe that keeps what the provider says. */
const openHome = () => {
  const store = createTestStore({ user: testUser });
  const seen: PianoData[] = [];
  const Probe = () => {
    seen.push(usePianoData());
    return null;
  };
  const renderer = renderWithStore(
    <PianoDataProvider>
      <Probe />
      <Home />
    </PianoDataProvider>,
    store
  );
  return { store, renderer, seen, latest: () => seen[seen.length - 1] };
};

describe("what the Pianos tab tells the other tabs", () => {
  it("is loading until the first load has finished, then ready", async () => {
    const { latest, seen } = openHome();

    expect(latest().status).toBe("loading");

    await flushPromises();

    expect(latest().status).toBe("ready");
    expect(seen.map((data) => data.status)).toEqual(expect.arrayContaining(["loading", "ready"]));
  });

  it("is failed when the pianos couldn't be loaded", async () => {
    captureAlerts();
    jest.mocked(getUserPianoEntries).mockRejectedValue(new Error("Network request failed"));
    const { latest } = openHome();

    await flushPromises();

    expect(latest().status).toBe("failed");
  });

  it("goes back to loading while a reload runs, then ready again", async () => {
    const { latest } = openHome();
    await flushPromises();
    let finish!: (pianos: any[]) => void;
    jest.mocked(getUserPianoEntries).mockReturnValue(
      new Promise((done) => {
        finish = done as any;
      }) as any
    );

    let reloading!: Promise<unknown>;
    await act(async () => {
      reloading = latest().refresher.current!();
    });
    expect(latest().status).toBe("loading");

    await act(async () => {
      finish([weber, estonia]);
      await reloading;
    });
    expect(latest().status).toBe("ready");
  });

  it("puts its reload where the other tabs can reach it, and that reload gets the pianos again", async () => {
    const { store, latest } = openHome();
    await flushPromises();
    expect(getUserPianoEntries).toHaveBeenCalledTimes(1);
    expect(store.getState().pianos.items.map((piano) => piano.$id)).toEqual(["weber"]);
    jest.mocked(getUserPianoEntries).mockResolvedValue([weber, estonia] as any);

    expect(typeof latest().refresher.current).toBe("function");
    await act(async () => {
      await latest().refresher.current!();
    });
    await flushPromises();

    expect(getUserPianoEntries).toHaveBeenCalledTimes(2);
    expect(store.getState().pianos.items.map((piano) => piano.$id)).toEqual(["weber", "estonia"]);
  });

  it("takes its reload away when it goes, so nothing calls a screen that isn't there", async () => {
    const { renderer, latest } = openHome();
    await flushPromises();
    const data = latest();
    expect(data.refresher.current).not.toBeNull();

    act(() => renderer.unmount());

    expect(data.refresher.current).toBeNull();
  });
});

describe("without a provider", () => {
  it("says everything is ready, and ignores what it is told", async () => {
    let seen!: PianoData;
    const Probe = () => {
      seen = usePianoData();
      return null;
    };
    await mount(
      <Provider store={createTestStore()}>
        <Probe />
      </Provider>
    );

    expect(seen.status).toBe("ready");
    expect(() => seen.reportStatus("loading")).not.toThrow();
    expect(seen.refresher.current).toBeNull();
  });
});
