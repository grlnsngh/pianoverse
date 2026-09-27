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
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  }),
}));
jest.mock("@react-native-picker/picker", () => {
  const React = require("react");
  const Picker = (props: any) => React.createElement("Picker", props, props.children);
  Picker.Item = (props: any) => React.createElement("PickerItem", props);
  return { Picker };
});
// The tab screens themselves are covered elsewhere
jest.mock("react-native-tab-view", () => {
  const React = require("react");
  return {
    TabView: (props: any) => React.createElement("TabView", props),
    SceneMap: () => () => null,
  };
});

import React from "react";
import { FlatList } from "react-native";
import { act } from "react-test-renderer";
import { router, useLocalSearchParams } from "expo-router";
import TabsLayout from "@/app/(tabs)/_layout";
import Create from "@/app/(tabs)/create";
import Home from "@/app/(tabs)/home";
import Profile from "@/app/(tabs)/profile";
import EditScreen from "@/app/edit/[id]";
import Review from "@/app/review";
import * as appwrite from "@/lib/appwrite";
import { setActiveTab } from "@/redux/navigation/actions";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const fieldValue = (renderer: any, title: string) =>
  renderer.root.findAll(
    (node: any) =>
      node.props.title === title && typeof node.props.handleChangeText === "function"
  )[0].props.value;

describe("after publishing", () => {
  const form = {
    category: "warehouse",
    title: "Kawai K-300",
    description: "Black polish",
    image: {
      uri: "file:///cache/ImagePicker/piano.jpeg",
      fileName: "piano.jpeg",
      fileSize: 1000,
    },
    make: "Other",
    companyAssociated: "Shamshersons",
    dateOfPurchase: new Date(),
    warehouseStoredSinceDate: new Date(),
    rentalStartDate: new Date(),
    rentalEndDate: new Date(),
    onSaleImportDate: new Date(),
    rentalPrice: 0,
    eventPurchasePrice: 0,
    onSalePrice: 0,
  };

  const publish = async () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ formData: JSON.stringify(form) });
    const store = createTestStore({ user: testUser });
    act(() => {
      store.dispatch(setActiveTab("create"));
    });
    const renderer = renderWithStore(
      <>
        <Create />
        <Review />
      </>,
      store
    );
    expect(fieldValue(renderer, "Title")).toBe("Kawai K-300");

    await pressText(renderer.root, "Publish");
    return { store, renderer };
  };

  it("goes back to the tabs instead of opening another copy of them", async () => {
    await publish();

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows the new piano on the Home tab", async () => {
    const { store } = await publish();

    expect(store.getState().navigation.activeTab).toBe("home");
    expect(store.getState().pianos.items.map((piano) => piano.title)).toEqual([
      "Kawai K-300",
    ]);
  });

  it("clears the Create form for the next piano", async () => {
    const { renderer } = await publish();

    expect(fieldValue(renderer, "Title")).toBe("");
    expect(fieldValue(renderer, "Description")).toBe("");
  });
});

describe("after saving an edit", () => {
  it("goes back and shows the saved changes everywhere", async () => {
    const piano = makePiano({ title: "Yamaha U1" });
    fakeBackend.documents.set(piano.$id, { ...piano });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: piano.$id });
    const store = createTestStore({ user: testUser, items: [piano] });
    const renderer = renderWithStore(<EditScreen />, store);

    act(() => {
      renderer.root
        .findAll(
          (node: any) =>
            node.props.title === "Title" &&
            typeof node.props.handleChangeText === "function"
        )[0]
        .props.handleChangeText("Yamaha U3");
    });
    await pressText(renderer.root, "Save Changes");

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    expect(store.getState().pianos.items[0].title).toBe("Yamaha U3");
  });
});

describe("tabs", () => {
  const tabIndex = (renderer: any) =>
    renderer.root.findAll((node: any) => (node.type as unknown) === "TabView")[0]
      .props.navigationState.index;

  it("shows whichever tab another screen selects", () => {
    const store = createTestStore();
    const renderer = renderWithStore(<TabsLayout />, store);
    expect(tabIndex(renderer)).toBe(0);

    act(() => {
      store.dispatch(setActiveTab("profile"));
    });

    expect(tabIndex(renderer)).toBe(2);
  });

  it("stores the tab the user swipes to", () => {
    const store = createTestStore();
    const renderer = renderWithStore(<TabsLayout />, store);

    act(() => {
      renderer.root
        .findAll((node: any) => (node.type as unknown) === "TabView")[0]
        .props.onIndexChange(1);
    });

    expect(store.getState().navigation.activeTab).toBe("create");
  });

  it("the profile's shortcuts switch tabs instead of opening new ones", async () => {
    const store = createTestStore({ user: testUser, items: [makePiano()] });
    act(() => {
      store.dispatch(setActiveTab("profile"));
    });
    const renderer = renderWithStore(<Profile />, store);

    await pressText(renderer.root, "Add New Piano");
    expect(store.getState().navigation.activeTab).toBe("create");

    await pressText(renderer.root, "View All Pianos");
    expect(store.getState().navigation.activeTab).toBe("home");
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("pull to refresh", () => {
  it("keeps the spinner until the pianos have loaded", async () => {
    let finishLoading: (items: any[]) => void = () => {};
    jest
      .spyOn(appwrite, "getUserPianoEntries")
      .mockResolvedValueOnce([makePiano()] as any)
      .mockImplementationOnce(
        () => new Promise((resolve) => (finishLoading = resolve as any))
      );
    const renderer = renderWithStore(<Home />, createTestStore());
    await flushPromises();
    const refreshing = () =>
      renderer.root.findByType(FlatList).props.refreshControl.props.refreshing;

    let refresh: Promise<void>;
    act(() => {
      refresh = renderer.root
        .findByType(FlatList)
        .props.refreshControl.props.onRefresh();
    });
    await flushPromises();
    expect(refreshing()).toBe(true);

    await act(async () => {
      finishLoading([makePiano()]);
      await refresh;
    });
    expect(refreshing()).toBe(false);
  });
});
