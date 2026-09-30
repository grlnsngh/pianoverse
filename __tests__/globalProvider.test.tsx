jest.mock("@/lib/appwrite", () => ({
  getCurrentUser: jest.fn(),
}));
jest.mock("@/services/notifications", () => ({
  prepareRentalReminders: jest.fn(() => Promise.resolve(false)),
  requestNotificationPermissions: jest.fn(() => Promise.resolve(false)),
  handleNotificationResponse: jest.fn(),
}));
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);

import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act } from "react-test-renderer";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import { getCurrentUser } from "@/lib/appwrite";
import {
  prepareRentalReminders,
  requestNotificationPermissions,
} from "@/services/notifications";
import { otherUser, testUser } from "./helpers/fixtures";
import { createTestStore, flushPromises, renderWithStore } from "./helpers/render";

let context: any;
const CaptureContext = () => {
  context = useGlobalContext();
  return null;
};

const renderProvider = async () => {
  const store = createTestStore();
  renderWithStore(
    <GlobalProvider>
      <CaptureContext />
    </GlobalProvider>,
    store
  );
  await flushPromises();
  return store;
};

beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(getCurrentUser).mockResolvedValue(null as any);
  await AsyncStorage.clear();
});

it("gets reminders ready at the start without asking anyone for a permission", async () => {
  await renderProvider();

  // The question comes later, from the sheet that explains it
  expect(prepareRentalReminders).toHaveBeenCalled();
  expect(requestNotificationPermissions).not.toHaveBeenCalled();
});

it("stores a freshly signed-in user in Redux (used by the Edit screen)", async () => {
  const store = await renderProvider();

  act(() => {
    context.setUser(testUser);
  });

  expect(store.getState().users.user).toEqual(testUser);
  expect(store.getState().users.isAuthenticated).toBe(true);
});

it("clears the Redux user on logout", async () => {
  jest.mocked(getCurrentUser).mockResolvedValue(testUser as any);
  const store = await renderProvider();
  expect(store.getState().users.user).toEqual(testUser);

  act(() => {
    context.setUser(null);
  });

  expect(store.getState().users.user).toBeNull();
  expect(store.getState().users.isAuthenticated).toBe(false);
});

it("replaces the Redux user when a different account signs in", async () => {
  jest.mocked(getCurrentUser).mockResolvedValue(testUser as any);
  const store = await renderProvider();

  act(() => {
    context.setUser(null);
  });
  act(() => {
    context.setUser(otherUser);
  });

  expect(store.getState().users.user).toEqual(otherUser);
  expect(context.user).toEqual(otherUser);
});

describe("opening the app", () => {
  const offline = () =>
    jest
      .mocked(getCurrentUser)
      .mockRejectedValue(new Error("Network request failed"));

  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("without a connection, carries on as the user signed in on this phone", async () => {
    // Opened once while online
    jest.mocked(getCurrentUser).mockResolvedValue(testUser as any);
    await renderProvider();

    offline();
    const store = await renderProvider();

    expect(context.loading).toBe(false);
    expect(context.isLogged).toBe(true);
    expect(context.user).toEqual(testUser);
    expect(store.getState().users.user).toEqual(testUser);
  });

  it("remembers someone who just signed in", async () => {
    await renderProvider();
    // What the sign-in screen does
    act(() => {
      context.setIsLogged(true);
      context.setUser(testUser);
    });
    await flushPromises();

    offline();
    await renderProvider();

    expect(context.isLogged).toBe(true);
    expect(context.user).toEqual(testUser);
  });

  it("without a connection, asks to sign in when nobody signed in on this phone", async () => {
    offline();
    await renderProvider();

    expect(context.loading).toBe(false);
    expect(context.isLogged).toBe(false);
    expect(context.user).toBeNull();
  });

  it("forgets the user who signed out", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(testUser as any);
    await renderProvider();
    act(() => {
      context.setIsLogged(false);
      context.setUser(null);
    });
    await flushPromises();

    offline();
    await renderProvider();

    expect(context.isLogged).toBe(false);
  });

  it("forgets the user when Appwrite says nobody is signed in any more", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(testUser as any);
    await renderProvider();
    // The session has ended, e.g. it was signed out on the server
    jest.mocked(getCurrentUser).mockResolvedValue(null as any);
    await renderProvider();
    expect(context.isLogged).toBe(false);

    offline();
    await renderProvider();

    expect(context.isLogged).toBe(false);
  });
});
