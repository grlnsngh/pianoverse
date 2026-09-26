jest.mock("@/lib/appwrite", () => ({
  getCurrentUser: jest.fn(),
}));
jest.mock("@/app/services/notifications", () => ({
  requestNotificationPermissions: jest.fn(() => Promise.resolve(false)),
  handleNotificationResponse: jest.fn(),
}));
jest.mock("expo-notifications", () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
}));

import React from "react";
import { act } from "react-test-renderer";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import { getCurrentUser } from "@/lib/appwrite";
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

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCurrentUser).mockResolvedValue(null as any);
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
