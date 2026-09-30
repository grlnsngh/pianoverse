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
    canDismiss: jest.fn(() => true),
    dismissAll: jest.fn(),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  }),
}));
import React from "react";
import { FlatList } from "react-native";
import { act } from "react-test-renderer";
import { router, useLocalSearchParams } from "expo-router";
import Create from "@/app/create";
import Home from "@/app/(tabs)/home";
import EditScreen from "@/app/edit/[id]";
import Review from "@/app/review";
import * as appwrite from "@/lib/appwrite";
import { setActiveTab } from "@/redux/navigation/actions";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  flushPromises,
  inputValue,
  pressText,
  renderWithStore,
  typeInto,
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

describe("after publishing", () => {
  const form = {
    category: "warehouse",
    title: "Kawai K-300",
    description: "Black polish",
    photos: [
      {
        uri: "file:///cache/ImagePicker/piano.jpeg",
        fileName: "piano.jpeg",
        fileSize: 1000,
      },
    ],
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
      store.dispatch(setActiveTab("account"));
    });
    const renderer = renderWithStore(
      <>
        <Create />
        <Review />
      </>,
      store
    );
    expect(inputValue(renderer.root, "Title")).toBe("Kawai K-300");

    await pressText(renderer.root, "Add piano");
    return { store, renderer };
  };

  it("says so, and waits for the person to choose what to do next", async () => {
    const { renderer } = await publish();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Piano added");
    expect(texts).toContain("Kawai K-300 is now in your stock.");
    expect(router.dismissAll).not.toHaveBeenCalled();
  });

  it("leaves the whole Add flow for the tabs when done, instead of opening another copy of them", async () => {
    const { renderer } = await publish();

    await pressText(renderer.root, "Done");

    // Back would only return to the form underneath
    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("opens the tabs afresh when the app was opened straight on the Add flow", async () => {
    jest.mocked(router.canDismiss).mockReturnValue(false);
    const { renderer } = await publish();

    await pressText(renderer.root, "Done");

    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/home");
  });

  it("shows the new piano on the Pianos tab", async () => {
    const { store } = await publish();

    expect(store.getState().navigation.activeTab).toBe("pianos");
    expect(store.getState().pianos.items.map((piano) => piano.title)).toEqual([
      "Kawai K-300",
    ]);
  });

  it("clears the Create form for the next piano", async () => {
    const { renderer } = await publish();

    expect(inputValue(renderer.root, "Title")).toBe("");
    expect(inputValue(renderer.root, "Notes")).toBe("");
  });
});

describe("after saving an edit", () => {
  it("goes back and shows the saved changes everywhere", async () => {
    const piano = makePiano({ title: "Yamaha U1" });
    fakeBackend.documents.set(piano.$id, { ...piano });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: piano.$id });
    const store = createTestStore({ user: testUser, items: [piano] });
    const renderer = renderWithStore(<EditScreen />, store);

    typeInto(renderer.root, "Title", "Yamaha U3");
    await pressText(renderer.root, "Save changes");

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    expect(store.getState().pianos.items[0].title).toBe("Yamaha U3");
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
