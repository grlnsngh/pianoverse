jest.mock("@/lib/appwrite", () => ({
  getUserPianoEntries: jest.fn(),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn(), back: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import React from "react";
import { FlatList } from "react-native";
import { act } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Home from "@/app/(tabs)/home";
import { getUserPianoEntries } from "@/lib/appwrite";
import {
  clearPianoCache,
  loadPianosFromCache,
  savePianosToCache,
} from "@/lib/pianoCache";
import { removePianoItems } from "@/redux/pianos/actions";
import { makePiano, otherUser, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

const yamaha = makePiano({ $id: "yamaha", title: "Yamaha U1" });
const kawai = makePiano({ $id: "kawai", title: "Kawai K-300" });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const renderHome = async () => {
  const store = createTestStore({ user: testUser });
  const renderer = renderWithStore(<Home />, store);
  await flushPromises();
  const ids = () => store.getState().pianos.items.map((piano) => piano.$id);
  return { store, renderer, ids };
};

const savedIds = async (accountId = testUser.accountId) =>
  (await loadPianosFromCache(accountId))?.pianos.map((piano) => piano.$id);

describe("the pianos saved on the device", () => {
  it("are updated after the list loads", async () => {
    jest.mocked(getUserPianoEntries).mockResolvedValue([yamaha, kawai] as any);

    await renderHome();

    expect(await savedIds()).toEqual(["yamaha", "kawai"]);
  });

  it("follow changes made in the app", async () => {
    jest.mocked(getUserPianoEntries).mockResolvedValue([yamaha, kawai] as any);
    const { store } = await renderHome();

    act(() => {
      store.dispatch(removePianoItems(["kawai"]));
    });
    await flushPromises();

    expect(await savedIds()).toEqual(["yamaha"]);
  });

  it("show at once while the server is slow", async () => {
    await savePianosToCache(testUser.accountId, [yamaha]);
    jest
      .mocked(getUserPianoEntries)
      .mockReturnValue(new Promise(() => {}) as any);

    const { ids } = await renderHome();

    expect(ids()).toEqual(["yamaha"]);
  });

  it("are shown when offline, and pulling down to refresh tries again", async () => {
    captureAlerts();
    await savePianosToCache(testUser.accountId, [yamaha]);
    jest
      .mocked(getUserPianoEntries)
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce([yamaha, kawai] as any);

    const { renderer, ids } = await renderHome();

    expect(ids()).toEqual(["yamaha"]);
    const banner = allTexts(renderer.root).find((text) =>
      text.startsWith("Offline.")
    );
    expect(banner).toMatch(/^Offline\. Showing pianos saved on \d+ \w+, \d+:\d+ [ap]m\.$/);

    await act(async () => {
      await renderer.root
        .findByType(FlatList)
        .props.refreshControl.props.onRefresh();
    });
    await flushPromises();

    expect(ids()).toEqual(["yamaha", "kawai"]);
    expect(allTexts(renderer.root).join(" ")).not.toMatch(/Offline/);
  });

  it("don't replace a fresher list from the server", async () => {
    await savePianosToCache(testUser.accountId, [yamaha]);
    // The saved copy is read only after the server has answered
    const stored = await AsyncStorage.getItem(`pianos:${testUser.accountId}`);
    // getItem is the storage mock itself, so only change this one call
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(stored), 30))
      );
    jest.mocked(getUserPianoEntries).mockResolvedValue([kawai] as any);

    const { ids } = await renderHome();
    await act(() => new Promise((resolve) => setTimeout(resolve, 60)));

    expect(ids()).toEqual(["kawai"]);
  });

  it("belong to one account", async () => {
    captureAlerts();
    await savePianosToCache(otherUser.accountId, [kawai]);
    jest
      .mocked(getUserPianoEntries)
      .mockRejectedValue(new Error("Network request failed"));

    const { ids } = await renderHome();

    expect(ids()).toEqual([]);
  });

  it("are all removed on sign-out", async () => {
    await savePianosToCache(testUser.accountId, [yamaha]);
    await savePianosToCache(otherUser.accountId, [kawai]);
    await AsyncStorage.setItem("something-else", "kept");

    await clearPianoCache();

    expect(await savedIds()).toBeUndefined();
    expect(await savedIds(otherUser.accountId)).toBeUndefined();
    expect(await AsyncStorage.getItem("something-else")).toBe("kept");
  });
});
