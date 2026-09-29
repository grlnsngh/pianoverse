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
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/edit/piano-1"),
}));
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);

import React from "react";
import { act } from "react-test-renderer";
import EditScreen from "@/app/edit/[id]";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";

let context: any;
const CaptureContext = () => {
  context = useGlobalContext();
  return null;
};

it("lets a user who just signed in save their changes", async () => {
  const alerts = captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
  const piano = makePiano({ title: "Yamaha U1" });
  fakeBackend.documents.set(piano.$id, { ...piano });
  // App starts logged out: no user in Redux yet
  const store = createTestStore({ items: [piano] });
  const renderer = renderWithStore(
    <GlobalProvider>
      <CaptureContext />
      <EditScreen />
    </GlobalProvider>,
    store
  );
  await flushPromises();

  // What the sign-in screen does after a successful login
  act(() => {
    context.setIsLogged(true);
    context.setUser(testUser);
  });
  await pressText(renderer.root, "Save Changes");

  expect(alerts.titles()).toEqual([]);
  expect(fakeBackend.documents.get("piano-1")).toMatchObject({
    users: testUser.$id,
    creator: testUser.accountId,
  });
});
