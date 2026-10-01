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
  useNavigation: jest.fn(),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
  scheduleRentalDueNotification: jest.fn(() => Promise.resolve([])),
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

import React from "react";
import { BackHandler } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import Create from "@/app/create";
import EditScreen from "@/app/edit/[id]";
import Review from "@/app/review";
import * as appwrite from "@/lib/appwrite";
import { resetCreateForm } from "@/redux/navigation/actions";
import { goToAddStep, setAddStepListener } from "@/utils/addFlow";
import { headingOffset, makeSections } from "@/components/MakePickerSheet";
import { createEmptyPianoForm, PianoFormState } from "@/utils/pianoForm";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  chooseCategory,
  chooseCompany,
  chooseMake,
  createTestStore,
  dialogOf,
  fillBasics,
  flushPromises,
  inputLabelled,
  inputValue,
  pickDate,
  pressDialog,
  pressLabel,
  pressRow,
  pressText,
  queryAllByText,
  renderWithStore,
  typeInto,
} from "./helpers/render";

const photoAsset = (name: string) => ({
  canceled: false,
  assets: [
    {
      uri: `file:///cache/ImagePicker/${name}.jpeg`,
      fileName: `${name}.jpeg`,
      fileSize: 1000,
      width: 800,
      height: 600,
      type: "image",
    },
  ],
});

// A navigation object that remembers what listens for leaving the screen
const listeners: Record<string, (event: any) => void> = {};
const navigation = {
  setOptions: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn((name: string, listener: (event: any) => void) => {
    listeners[name] = listener;
    return jest.fn();
  }),
};

const tryToLeave = () => {
  const event = {
    preventDefault: jest.fn(),
    data: { action: { type: "GO_BACK" } },
  };
  act(() => listeners.beforeRemove(event));
  return event;
};

// Presses a button without waiting for what it starts to finish
const startPress = (renderer: ReactTestRenderer, text: string) => {
  let node: any = queryAllByText(renderer.root, text)[0];
  while (node && typeof node.props.onPress !== "function") node = node.parent;
  act(() => {
    node.props.onPress();
  });
};

const hasLabel = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll(
    (node) =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === "function"
  ).length > 0;

const shownPhotos = (renderer: ReactTestRenderer) => [
  ...new Set(
    renderer.root
      .findAll((node) => typeof node.props.source?.uri === "string")
      .map((node) => node.props.source.uri as string)
  ),
];

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  jest.mocked(useNavigation).mockReturnValue(navigation as any);
  jest.mocked(router.canDismiss).mockReturnValue(true);
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue(photoAsset("one") as any);
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue({ blob: async () => ({ size: 1000 }) } as any);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const renderCreate = (store = createTestStore({ user: testUser })) => ({
  store,
  renderer: renderWithStore(<Create />, store),
});

describe("step 1 of the Add flow", () => {
  it("says how many photos there can be, using the app's limit", () => {
    const { renderer } = renderCreate();

    expect(allTexts(renderer.root)).toContain(
      "Up to 10 photos. The first one is the cover."
    );
  });

  it("asks whether to use the camera or the gallery when Add is pressed", async () => {
    const { renderer } = renderCreate();

    await pressLabel(renderer.root, "Add a photo");

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Take a photo");
    expect(texts).toContain("Choose from gallery");
  });

  it("marks the first photo as the cover, and another can be made the cover", async () => {
    const { renderer } = renderCreate();
    await pressLabel(renderer.root, "Add a photo");
    await pressLabel(renderer.root, "Choose from gallery");
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue(photoAsset("two") as any);
    await pressLabel(renderer.root, "Add a photo");
    await pressLabel(renderer.root, "Choose from gallery");

    expect(allTexts(renderer.root)).toContain("Cover");
    expect(shownPhotos(renderer)).toEqual([
      "file:///cache/ImagePicker/one.jpeg",
      "file:///cache/ImagePicker/two.jpeg",
    ]);

    await pressLabel(renderer.root, "Make photo 2 the cover");

    expect(shownPhotos(renderer)).toEqual([
      "file:///cache/ImagePicker/two.jpeg",
      "file:///cache/ImagePicker/one.jpeg",
    ]);
  });

  it("takes a photo out with its remove button", async () => {
    const { renderer } = renderCreate();
    await pressLabel(renderer.root, "Add a photo");
    await pressLabel(renderer.root, "Choose from gallery");
    expect(hasLabel(renderer, "Cover photo")).toBe(true);

    await pressLabel(renderer.root, "Remove photo 1");

    expect(hasLabel(renderer, "Cover photo")).toBe(false);
    expect(allTexts(renderer.root)).not.toContain("Cover");
  });

  it("shows the make, company and purchase date in rows that open pickers", async () => {
    const { renderer } = renderCreate();

    await chooseMake(renderer.root, "Schumann");
    await chooseCompany(renderer.root, "Kirpalsons");
    await pickDate(renderer.root, "Purchased", new Date(2026, 8, 3));

    expect(hasLabel(renderer, "Make, Schumann")).toBe(true);
    expect(hasLabel(renderer, "Company, Kirpalsons")).toBe(true);
    expect(hasLabel(renderer, "Purchased, 3 Sep 2026")).toBe(true);
  });

  it("offers the four companies to choose from", async () => {
    const { renderer } = renderCreate();

    await pressRow(renderer.root, "Company");

    const texts = allTexts(renderer.root);
    ["Shamshersons", "Kirpalsons", "RS Music Center", "The Piano Services"].forEach(
      (company) => expect(texts).toContain(company)
    );
  });

  describe("the Make picker", () => {
    it("lists the makes A to Z under the letter they start with", async () => {
      const { renderer } = renderCreate();

      await pressRow(renderer.root, "Make");

      const texts = allTexts(renderer.root);
      const letters = texts.filter((text) => /^[A-Z]$/.test(text));
      // Once as a heading and once in the strip of letters
      expect(letters.slice(0, 3)).toEqual(["A", "B", "C"]);
      expect(texts.indexOf("Alison")).toBeLessThan(texts.indexOf("Zimmermann"));
      expect(texts).toContain("Make");
    });

    it("finds makes as you type, and says when none match", async () => {
      const { renderer } = renderCreate();
      await pressRow(renderer.root, "Make");

      typeInto(renderer.root, "Search makes", "sch");
      let texts = allTexts(renderer.root);
      expect(texts).toContain("Schimmel");
      expect(texts).toContain("Schumann");
      expect(texts).not.toContain("Zimmermann");

      typeInto(renderer.root, "Search makes", "zzz");
      texts = allTexts(renderer.root);
      expect(texts).toContain("No make matches “zzz”.");
    });

    it("shows which make is chosen", async () => {
      const { renderer } = renderCreate();
      await chooseMake(renderer.root, "Schumann");
      await pressRow(renderer.root, "Make");

      const options = renderer.root.findAll(
        (node) =>
          node.props.accessibilityLabel === "Schumann" &&
          typeof node.props.onPress === "function"
      );
      expect(options[options.length - 1].props.accessibilityState).toEqual({
        selected: true,
      });
    });

    it("has a strip of letters at the edge that can be pressed", async () => {
      const { renderer } = renderCreate();
      await pressRow(renderer.root, "Make");

      const strip = renderer.root.findAll(
        (node) =>
          typeof node.props.testID === "string" &&
          node.props.testID.startsWith("make-index-") &&
          typeof node.props.onPress === "function"
      );

      // One for each letter a make starts with
      expect(strip.map((node) => node.props.testID.slice(-1))).toEqual(
        expect.arrayContaining(["A", "S", "Z"])
      );
      // Pressing one scrolls the list to its heading (a scroll view in a test does nothing)
      expect(() =>
        act(() =>
          strip.find((node) => node.props.testID === "make-index-S")!.props.onPress()
        )
      ).not.toThrow();
    });

    it("knows where each heading is, since headings and rows have fixed heights", () => {
      const sections = makeSections(["Alison", "Burgmann", "B.Steiner", "Weber"], "");

      expect(sections.map((section) => section.letter)).toEqual(["A", "B", "W"]);
      // A heading is 32 high and a row 52
      expect(headingOffset(sections, 0)).toBe(0);
      expect(headingOffset(sections, 1)).toBe(32 + 52);
      expect(headingOffset(sections, 2)).toBe(32 + 52 + 32 + 2 * 52);
    });
  });

  it("goes on only once each thing is filled in, saying what is missing", async () => {
    const alerts = captureAlerts();
    const { renderer } = renderCreate();

    await pressLabel(renderer.root, "Add a photo");
    await pressLabel(renderer.root, "Choose from gallery");
    await pressText(renderer.root, "Continue");
    expect(alerts.spy.mock.calls.pop()?.[1]).toBe("Please enter a title.");

    typeInto(renderer.root, "Title", "Kawai K-300");
    await pressText(renderer.root, "Continue");
    expect(alerts.spy.mock.calls.pop()?.[1]).toBe("Please choose the make.");

    await chooseMake(renderer.root, "Other");
    await pressText(renderer.root, "Continue");
    expect(alerts.spy.mock.calls.pop()?.[1]).toBe("Please choose the company.");

    await chooseCompany(renderer.root, "Shamshersons");
    await pressText(renderer.root, "Continue");
    expect(alerts.spy.mock.calls.pop()?.[1]).toBe("Please add some notes.");

    typeInto(renderer.root, "Notes", "Black polish");
    await pressText(renderer.root, "Continue");
    expect(allTexts(renderer.root)).toContain("Step 2 of 3");
  });
});

describe("step 2 of the Add flow", () => {
  const onStep2 = async () => {
    const result = renderCreate();
    await fillBasics(result.renderer.root);
    await pressText(result.renderer.root, "Continue");
    return result;
  };

  it("offers the four ways a piano is used", async () => {
    const { renderer } = await onStep2();

    ["Rentable", "Events", "On sale", "Warehouse"].forEach((label) =>
      expect(hasLabel(renderer, label)).toBe(true)
    );
  });

  it.each([
    ["rentable", ["Customer", "Mobile", "Address", "Rent"], ["Starts", "Ends"]],
    ["events", ["Purchase price", "Bought from", "Model number", "B number"], []],
    ["on_sale", ["Sale price", "Bought from"], ["Import date"]],
    ["warehouse", [], ["Stored since"]],
  ])("shows the fields of a %s piano", async (category, inputs, rows) => {
    const { renderer } = await onStep2();

    await chooseCategory(renderer.root, category);

    inputs.forEach((label) => expect(inputLabelled(renderer.root, label)).toBeTruthy());
    rows.forEach((label) =>
      expect(
        renderer.root.findAll(
          (node) =>
            typeof node.props.accessibilityLabel === "string" &&
            node.props.accessibilityLabel.startsWith(`${label},`)
        ).length
      ).toBeGreaterThan(0)
    );
  });

  it("says how long the rental is and that there will be reminders", async () => {
    const { renderer } = await onStep2();

    await pickDate(renderer.root, "Ends", new Date(2027, 2, 1));
    await pickDate(renderer.root, "Starts", new Date(2026, 8, 1));

    expect(allTexts(renderer.root)).toContain(
      "A 6-month rental. You’ll get reminders before it ends."
    );
  });

  it("puts +91 before a mobile number, unless it was typed with a country code", async () => {
    const { renderer } = await onStep2();
    expect(allTexts(renderer.root)).toContain("+91");

    typeInto(renderer.root, "Mobile", "+91 98765 43210");

    expect(allTexts(renderer.root)).not.toContain("+91");
  });

  it("keeps what was typed for a category when the choice is changed and changed back", async () => {
    const { renderer } = await onStep2();
    typeInto(renderer.root, "Customer", "Asha Mehta");

    await chooseCategory(renderer.root, "warehouse");
    await chooseCategory(renderer.root, "rentable");

    expect(inputValue(renderer.root, "Customer")).toBe("Asha Mehta");
  });

  it("goes back a step with Android's back button before it leaves", async () => {
    const handlers: (() => boolean | null | undefined)[] = [];
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, handler) => {
      handlers.push(handler);
      return { remove: () => handlers.splice(handlers.indexOf(handler), 1) };
    });
    const { renderer } = await onStep2();

    let handled = false;
    act(() => {
      handled = [...handlers].reverse().some((handler) => handler());
    });

    expect(handled).toBe(true);
    expect(allTexts(renderer.root)).toContain("Step 1 of 3");
  });
});

describe("leaving the Add flow", () => {
  it("leaves without asking when nothing was entered", () => {
    renderCreate();

    const event = tryToLeave();

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("asks before throwing away what was entered", async () => {
    const { renderer } = renderCreate();
    typeInto(renderer.root, "Title", "Kawai K-300");

    const event = tryToLeave();

    expect(event.preventDefault).toHaveBeenCalled();
    expect(dialogOf(renderer.root)).toEqual({
      title: "Stop adding this piano?",
      message: "What you entered so far will be lost.",
      // The one that throws work away first, the safe one last
      actions: ["Discard", "Keep going"],
    });
    await pressDialog(renderer.root, "Discard");
    expect(navigation.dispatch).toHaveBeenCalledWith(event.data.action);
  });

  it("stays when the person keeps going", async () => {
    const { renderer } = renderCreate();
    typeInto(renderer.root, "Title", "Kawai K-300");

    tryToLeave();
    await pressDialog(renderer.root, "Keep going");

    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  it("doesn't ask once the piano was published, even before the form is cleared", () => {
    const { renderer, store } = renderCreate();
    typeInto(renderer.root, "Title", "Kawai K-300");

    // What publishing does, straight before it leaves
    store.dispatch(resetCreateForm());
    const event = tryToLeave();

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("starts over from the first step once the piano was published", async () => {
    const { renderer, store } = renderCreate();
    await fillBasics(renderer.root);
    await pressText(renderer.root, "Continue");

    act(() => {
      store.dispatch(resetCreateForm());
    });

    expect(allTexts(renderer.root)).toContain("Step 1 of 3");
    expect(inputValue(renderer.root, "Title")).toBe("");
  });

  it("comes back to the step the review's Edit link is about", async () => {
    const { renderer } = renderCreate();
    await fillBasics(renderer.root);
    await pressText(renderer.root, "Continue");

    act(() => goToAddStep(1));

    expect(allTexts(renderer.root)).toContain("Step 1 of 3");
    expect(inputValue(renderer.root, "Title")).toBe("Kawai K-300");
  });
});

describe("the review, publishing and published screens", () => {
  const rentalForm = (changes: Partial<PianoFormState> = {}) => ({
    ...createEmptyPianoForm(),
    category: "rentable",
    title: "Schumann S-110",
    description: "Ebony finish, tuned on delivery.",
    photos: [
      { uri: "file:///cache/ImagePicker/one.jpeg", fileName: "one.jpeg", fileSize: 1000 },
      { uri: "file:///cache/ImagePicker/two.jpeg", fileName: "two.jpeg", fileSize: 1000 },
    ],
    make: "Schumann",
    companyAssociated: "Kirpalsons",
    dateOfPurchase: new Date(2026, 8, 3),
    rentalCustomerName: "Anita Rao",
    rentalCustomerAddress: "14, Model Town, Ludhiana",
    rentalCustomerMobileNumber: "98765 43210",
    rentalStartDate: new Date(2026, 8, 29),
    rentalEndDate: new Date(2027, 2, 29),
    rentalPrice: 4500,
    ...changes,
  });

  const renderReview = (changes: Partial<PianoFormState> = {}) => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ formData: JSON.stringify(rentalForm(changes)) });
    const store = createTestStore({ user: testUser });
    return { store, renderer: renderWithStore(<Review />, store) };
  };

  describe("the review", () => {
    it("summarises the piano and its rental", () => {
      const { renderer } = renderReview();

      const texts = allTexts(renderer.root);
      [
        "Step 3 of 3",
        "Ready to add?",
        "Schumann S-110",
        "Rentable · 2 photos",
        "Schumann",
        "Kirpalsons",
        "3 Sep 2026",
        "Ebony finish, tuned on delivery.",
        "Anita Rao",
        "+91 98765 43210",
        "14, Model Town, Ludhiana",
        "29 Sep 2026 – 29 Mar 2027",
        "₹4,500",
      ].forEach((text) => expect(texts).toContain(text));
    });

    it.each([
      [
        "events",
        { eventPurchasePrice: 780000, eventPurchaseFrom: "Dealer", eventModelNumber: "M1", eventBNumber: "B7" },
        ["Event", "₹7,80,000", "Dealer", "M1", "B7"],
      ],
      [
        "on_sale",
        { onSalePrice: 250000, onSalePurchaseFrom: "Importer", onSaleImportDate: new Date(2026, 2, 10) },
        ["Sale", "₹2,50,000", "Importer", "10 Mar 2026"],
      ],
      [
        "warehouse",
        { warehouseStoredSinceDate: new Date(2026, 1, 1) },
        ["Warehouse", "1 Feb 2026"],
      ],
    ])("shows what a %s piano has instead of a rental", (category, changes, expected) => {
      const { renderer } = renderReview({ category, ...changes });

      const texts = allTexts(renderer.root);
      expected.forEach((text) => expect(texts).toContain(text));
      expect(texts).not.toContain("Customer");
      expect(texts).not.toContain("Rental");
    });

    it("sends the Edit links back to the step they are about", async () => {
      const goTo = jest.fn();
      const stop = setAddStepListener(goTo);
      const { renderer } = renderReview();

      await pressLabel(renderer.root, "Edit piano");
      await pressLabel(renderer.root, "Edit rental");
      stop();

      expect(goTo.mock.calls).toEqual([[1], [2]]);
      expect(router.back).toHaveBeenCalledTimes(2);
    });

    it("has a Back button that returns to the form", async () => {
      const { renderer } = renderReview();

      await pressText(renderer.root, "Back");

      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it("asks before cancelling the whole flow, and then doesn't ask again", async () => {
      const { renderer, store } = renderReview();

      await pressLabel(renderer.root, "Cancel");
      expect(dialogOf(renderer.root)?.title).toBe("Stop adding this piano?");
      await pressDialog(renderer.root, "Keep going");
      expect(router.dismissAll).not.toHaveBeenCalled();

      await pressLabel(renderer.root, "Cancel");
      await pressDialog(renderer.root, "Discard");

      expect(router.dismissAll).toHaveBeenCalledTimes(1);
      // The form under it is marked finished, so leaving it doesn't ask too
      expect(store.getState().navigation.createFormResetCount).toBe(1);
    });
  });

  describe("publishing", () => {
    // A save that waits, so what is shown while it goes on can be looked at
    const startPublishing = async () => {
      let report: (finished: number, total: number) => void = () => {};
      let finish: (piano: any) => void = () => {};
      let fail: (error: Error) => void = () => {};
      jest.spyOn(appwrite, "createPianoEntry").mockImplementation(
        (_data, onProgress) =>
          new Promise((resolve, reject) => {
            report = onProgress ?? report;
            finish = resolve;
            fail = reject;
          }) as any
      );
      const result = renderReview();
      startPress(result.renderer, "Add piano");
      return {
        ...result,
        report: (finished: number, total: number) => act(() => report(finished, total)),
        finish: (piano: any) => finish(piano),
        fail: (error: Error) => fail(error),
      };
    };

    it("shows how far the photos have got", async () => {
      const { renderer, report } = await startPublishing();

      report(0, 2);
      let texts = allTexts(renderer.root);
      expect(texts).toContain("Adding your piano");
      expect(texts).toContain("Uploading photo 1 of 2");
      expect(texts).toContain("Keep the app open until this finishes.");

      report(1, 2);
      expect(allTexts(renderer.root)).toContain("Uploading photo 2 of 2");
      const [bar] = renderer.root.findAll(
        (node) =>
          node.props.accessibilityRole === "progressbar" &&
          node.props.accessibilityValue?.max === 100
      );
      // One of the two photos and the saving itself still to go
      expect(bar.props.accessibilityValue.now).toBe(33);

      report(2, 2);
      texts = allTexts(renderer.root);
      expect(texts).toContain("Saving your piano");
    });

    it("keeps Android's back button from leaving while it saves", async () => {
      const handlers: (() => boolean | null | undefined)[] = [];
      jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, handler) => {
        handlers.push(handler);
        return { remove: () => handlers.splice(handlers.indexOf(handler), 1) };
      });
      await startPublishing();

      let handled = false;
      act(() => {
        handled = [...handlers].reverse().some((handler) => handler());
      });

      expect(handled).toBe(true);
      expect(router.dismissAll).not.toHaveBeenCalled();
    });

    it("goes back to the review, with the reason, when it can't be saved", async () => {
      const alerts = captureAlerts();
      const { renderer, fail } = await startPublishing();

      await act(async () => {
        fail(new Error("Network request failed"));
      });
      await flushPromises();

      expect(alerts.titles()).toEqual(["Error while uploading"]);
      expect(alerts.spy.mock.calls[0][1]).toBe("Network request failed");
      expect(allTexts(renderer.root)).toContain("Ready to add?");
      expect(hasLabel(renderer, "Edit piano")).toBe(true);
    });
  });

  describe("published", () => {
    const publish = async (changes: Partial<PianoFormState> = {}) => {
      const result = renderReview(changes);
      await pressText(result.renderer.root, "Add piano");
      const [id] = [...fakeBackend.documents.keys()];
      return { ...result, id };
    };

    it("says the piano is in stock, and that a rental will have reminders", async () => {
      const { renderer } = await publish();

      const texts = allTexts(renderer.root);
      expect(texts).toContain("Piano added");
      expect(texts).toContain(
        "Schumann S-110 is now in your stock. You’ll get reminders before its rental ends."
      );
    });

    it("promises no reminders for a piano that isn't rented out", async () => {
      const { renderer } = await publish({
        category: "warehouse",
        warehouseStoredSinceDate: new Date(2026, 1, 1),
      });

      expect(allTexts(renderer.root)).toContain(
        "Schumann S-110 is now in your stock."
      );
    });

    it("opens the new piano's page from View piano, leaving the flow first", async () => {
      const { renderer, id } = await publish();

      await pressText(renderer.root, "View piano");

      expect(router.dismissAll).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith(`/detail/${id}`);
    });

    it("goes back to a cleared form from Add another", async () => {
      const { renderer, store } = await publish();

      await pressText(renderer.root, "Add another");

      expect(router.back).toHaveBeenCalledTimes(1);
      expect(router.dismissAll).not.toHaveBeenCalled();
      expect(store.getState().navigation.createFormResetCount).toBe(1);
    });

    it("lands on the Pianos tab when done", async () => {
      const { renderer, store } = await publish();

      await pressText(renderer.root, "Done");

      expect(router.dismissAll).toHaveBeenCalledTimes(1);
      expect(store.getState().navigation.activeTab).toBe("pianos");
    });

    it("treats Android's back button as Done", async () => {
      const handlers: (() => boolean | null | undefined)[] = [];
      jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, handler) => {
        handlers.push(handler);
        return { remove: () => handlers.splice(handlers.indexOf(handler), 1) };
      });
      await publish();

      act(() => {
        [...handlers].reverse().some((handler) => handler());
      });

      expect(router.dismissAll).toHaveBeenCalledTimes(1);
    });
  });
});

describe("the Edit screen", () => {
  const piano = makePiano({ title: "Yamaha U1" });

  const renderEdit = () => {
    fakeBackend.documents.set(piano.$id, { ...piano });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: piano.$id });
    return renderWithStore(
      <EditScreen />,
      createTestStore({ user: testUser, items: [piano] })
    );
  };

  it("uses the same fields as the Add flow, on one screen", () => {
    const renderer = renderEdit();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Edit piano");
    expect(texts).toContain("Save changes");
    expect(inputValue(renderer.root, "Title")).toBe("Yamaha U1");
    expect(inputValue(renderer.root, "Notes")).toBe("Upright piano");
    expect(hasLabel(renderer, "Warehouse")).toBe(true);
    expect(hasLabel(renderer, "Make, Other")).toBe(true);
  });

  it("shows Saving on its button while it saves", async () => {
    let finish: (piano: any) => void = () => {};
    jest.spyOn(appwrite, "updatePianoEntry").mockImplementation(
      () => new Promise((resolve) => (finish = resolve)) as any
    );
    const renderer = renderEdit();

    await act(async () => {
      renderer.root
        .find(
          (node) =>
            node.props.accessibilityLabel === "Save changes" &&
            typeof node.props.onPress === "function"
        )
        .props.onPress();
    });

    expect(allTexts(renderer.root)).toContain("Saving");
    await act(async () => {
      finish({ ...piano, $id: piano.$id });
    });
  });

  it("says when the piano can't be found", () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "gone" });
    const renderer = renderWithStore(
      <EditScreen />,
      createTestStore({ user: testUser, items: [] })
    );

    expect(allTexts(renderer.root)).toContain("Piano not found");
  });
});
