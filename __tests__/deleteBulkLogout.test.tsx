jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn() })),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => {
  const context = {
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  };
  return { useGlobalContext: () => context };
});

import React from "react";
import { act } from "react-test-renderer";
import { addDays, format } from "date-fns";
import { router } from "expo-router";
import Profile from "@/app/(tabs)/profile";
import BulkOperationsBar from "@/app/components/BulkOperationsBar";
import { scheduleAllRentalNotifications } from "@/app/services/notifications";
import { useGlobalContext } from "@/context/GlobalProvider";
import { deletePianoEntry } from "@/lib/appwrite";
import {
  setBulkSelectionMode,
  toggleItemSelection,
} from "@/redux/pianos/actions";
import { fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  captureToasts,
  createTestStore,
  pressText,
  queryAllByText,
  renderWithStore,
} from "./helpers/render";

const inTwentyDays = format(addDays(new Date(), 20), "yyyy-MM-dd");
const piano = (id: string, overrides = {}) =>
  makePiano({
    $id: id,
    title: `Piano ${id}`,
    category: "rentable",
    rental_period_end: inTwentyDays as any,
    image_url: fileViewUrl(`${id}-image`),
    ...overrides,
  });

const store = (pianos: ReturnType<typeof piano>[]) => {
  pianos.forEach((item) => {
    fakeBackend.documents.set(item.$id, { ...item });
    fakeBackend.files.set(`${item.$id}-image`, {
      name: "image.jpg",
      type: "image/jpeg",
      size: 10,
      uri: "file:///image.jpg",
    });
  });
  return createTestStore({ user: testUser, items: pianos });
};

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  alerts = captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("deleting a piano", () => {
  it("still deletes the piano when its image is already gone", async () => {
    store([piano("a")]);
    fakeBackend.files.clear();

    await deletePianoEntry(piano("a"));

    expect(fakeBackend.documents.has("a")).toBe(false);
  });

  it("keeps the image when the piano itself can't be deleted", async () => {
    store([piano("a")]);
    fakeBackend.documents.delete("a"); // e.g. deleted elsewhere / no permission

    await expect(deletePianoEntry(piano("a"))).rejects.toThrow();

    expect(fakeBackend.files.has("a-image")).toBe(true);
  });
});

describe("bulk selection", () => {
  const renderBar = (pianos: ReturnType<typeof piano>[], selected: string[]) => {
    const testStore = store(pianos);
    act(() => {
      testStore.dispatch(setBulkSelectionMode(true));
      selected.forEach((id) => testStore.dispatch(toggleItemSelection(id)));
    });
    const onRefresh = jest.fn();
    const renderer = renderWithStore(
      <BulkOperationsBar onRefresh={onRefresh} />,
      testStore
    );
    return { testStore, renderer, onRefresh };
  };

  const deleteSelected = async (renderer: ReturnType<typeof renderBar>["renderer"]) => {
    await act(async () => {
      renderer.root
        .findAll((node) => node.props.accessibilityLabel === "Delete selected pianos")[0]
        .props.onPress();
    });
    await pressText(renderer.root, "Delete");
  };

  it("stays visible with nothing selected, so selection mode can be left", async () => {
    const { testStore, renderer } = renderBar([piano("a")], []);

    expect(allTexts(renderer.root)).toContain("0 selected");

    await act(async () => {
      renderer.root
        .findAll((node) => node.props.accessibilityLabel === "Leave selection mode")[0]
        .props.onPress();
    });
    expect(testStore.getState().pianos.isBulkSelectionMode).toBe(false);
  });

  it("deletes the selected pianos and their reminders, then leaves selection mode", async () => {
    const pianos = [piano("a"), piano("b"), piano("c")];
    await scheduleAllRentalNotifications(pianos);
    const toasts = captureToasts();
    const { testStore, renderer, onRefresh } = renderBar(pianos, ["a", "b"]);

    await deleteSelected(renderer);

    expect([...fakeBackend.documents.keys()]).toEqual(["c"]);
    expect(testStore.getState().pianos.items.map((item) => item.$id)).toEqual(["c"]);
    expect(fakeNotifications.rentalReminders("a")).toEqual([]);
    expect(fakeNotifications.rentalReminders("b")).toEqual([]);
    expect(fakeNotifications.rentalReminders("c")).not.toEqual([]);
    expect(testStore.getState().pianos.isBulkSelectionMode).toBe(false);
    expect(toasts).toEqual(["Deleted 2 pianos"]);
    expect(onRefresh).toHaveBeenCalled();
  });

  it("tells the user when some pianos couldn't be deleted", async () => {
    const pianos = [piano("a"), piano("b")];
    const { testStore, renderer } = renderBar(pianos, ["a", "b"]);
    fakeBackend.documents.delete("b");

    await deleteSelected(renderer);

    expect(alerts.titles()).toEqual(["Delete Failed"]);
    expect(testStore.getState().pianos.items.map((item) => item.$id)).toEqual(["b"]);
    expect(testStore.getState().pianos.selectedItems).toEqual(["b"]);
    expect(testStore.getState().pianos.isBulkSelectionMode).toBe(true);
  });
});

describe("logging out", () => {
  const renderProfile = async () => {
    const pianos = [piano("a")];
    await scheduleAllRentalNotifications(pianos);
    const testStore = store(pianos);
    const renderer = renderWithStore(<Profile />, testStore);
    return { testStore, renderer };
  };

  const confirmSignOut = async (renderer: any) => {
    await pressText(renderer.root, "Sign Out");
    // The confirmation dialog's button
    const buttons = queryAllByText(renderer.root, "Sign Out");
    await act(async () => {
      let node: any = buttons[buttons.length - 1];
      while (typeof node.props.onPress !== "function") node = node.parent;
      await node.props.onPress();
    });
  };

  it("clears the previous user's pianos and reminders", async () => {
    const { testStore, renderer } = await renderProfile();

    await confirmSignOut(renderer);

    expect(testStore.getState().pianos.items).toEqual([]);
    expect(testStore.getState().pianos.filteredItems).toEqual([]);
    expect(fakeNotifications.rentalReminders()).toEqual([]);
    expect(useGlobalContext().setUser).toHaveBeenCalledWith(null);
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("stays signed in and says so when signing out fails", async () => {
    const { testStore, renderer } = await renderProfile();
    fakeBackend.signOutError = new Error("Network request failed");

    await confirmSignOut(renderer);

    expect(alerts.titles()).toEqual(["Sign Out Failed"]);
    expect(testStore.getState().pianos.items).toHaveLength(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("signs out locally when the session had already expired", async () => {
    const { testStore, renderer } = await renderProfile();
    fakeBackend.signOutError = Object.assign(
      new Error("User (role: guests) missing scope (account)"),
      { code: 401 }
    );

    await confirmSignOut(renderer);

    expect(alerts.titles()).toEqual([]);
    expect(testStore.getState().pianos.items).toEqual([]);
    expect(router.replace).toHaveBeenCalledWith("/");
  });
});
