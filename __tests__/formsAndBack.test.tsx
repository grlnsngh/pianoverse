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
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
  scheduleRentalDueNotification: jest.fn(() => Promise.resolve([])),
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

import fs from "fs";
import path from "path";
import React from "react";
import { BackHandler } from "react-native";
import { act } from "react-test-renderer";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Home from "@/app/(tabs)/home";
import Create from "@/app/create";
import EditScreen from "@/app/edit/[id]";
import * as appwrite from "@/lib/appwrite";
import {
  setBulkSelectionMode,
  toggleItemSelection,
} from "@/redux/pianos/actions";
import { rentalDetailsError, toNationalMobile } from "@/utils/validation";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  fillBasics,
  flushPromises,
  inputLabelled,
  pickDate,
  pressLabel,
  pressRow,
  pressText,
  renderWithStore,
  typeInto,
} from "./helpers/render";

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  alerts = captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Android back button", () => {
  const pianos = [makePiano({ $id: "a" }), makePiano({ $id: "b" })];

  const renderHome = async () => {
    const handlers: (() => boolean | null | undefined)[] = [];
    jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation((_event, handler) => {
        handlers.push(handler);
        return {
          remove: () => handlers.splice(handlers.indexOf(handler), 1),
        };
      });
    jest
      .spyOn(appwrite, "getUserPianoEntries")
      .mockResolvedValue(pianos as any);
    const store = createTestStore({ user: testUser });
    renderWithStore(<Home />, store);
    await flushPromises();
    // Like BackHandler: the newest listener goes first, and one returning
    // true stops the app going back
    const pressBack = () => {
      let handled = false;
      act(() => {
        handled = [...handlers].reverse().some((handler) => handler());
      });
      return handled;
    };
    return { store, pressBack };
  };

  it("leaves selection mode instead of leaving the app", async () => {
    const { store, pressBack } = await renderHome();
    act(() => {
      store.dispatch(setBulkSelectionMode(true));
      store.dispatch(toggleItemSelection("a"));
    });

    expect(pressBack()).toBe(true);

    expect(store.getState().pianos.isBulkSelectionMode).toBe(false);
    expect(store.getState().pianos.selectedItems).toEqual([]);
  });

  it("works as usual when nothing is being selected", async () => {
    const { store, pressBack } = await renderHome();
    act(() => {
      store.dispatch(setBulkSelectionMode(true));
    });
    pressBack();

    // The second press goes back as normal
    expect(pressBack()).toBe(false);
  });
});

describe("rental details", () => {
  describe("the rules", () => {
    it.each([
      ["9876543210", "9876543210"],
      ["98765 43210", "9876543210"],
      ["+91 98765-43210", "9876543210"],
      ["09876543210", "9876543210"],
      ["12345", null],
      ["+44 7700 900123", null],
      ["", null],
    ])("reads %p as %p", (typed, expected) => {
      expect(toNationalMobile(typed)).toBe(expected);
    });

    it("needs the rental to end at least a day after it starts", () => {
      const start = new Date(2026, 8, 1, 18, 0);
      const check = (endDate: Date) =>
        rentalDetailsError({ mobile: "9876543210", startDate: start, endDate });

      expect(check(new Date(2026, 8, 2, 9, 0))).toBeNull();
      expect(check(new Date(2026, 8, 1, 23, 0))).toMatch(/end date/);
      expect(check(new Date(2026, 7, 20))).toMatch(/end date/);
    });
  });

  describe("on the Edit screen", () => {
    const rental = makePiano({
      category: "rentable",
      rental_customer_name: "Asha Mehta",
      rental_customer_address: "12 MG Road",
      rental_customer_mobile: "9876543210",
      rental_period_start: "2026-09-01T00:00:00.000+00:00" as any,
      rental_period_end: "2026-12-01T00:00:00.000+00:00" as any,
      rental_price: 4000,
    });

    const renderEdit = () => {
      fakeBackend.documents.set(rental.$id, { ...rental });
      return renderWithStore(
        <EditScreen />,
        createTestStore({ user: testUser, items: [rental] })
      );
    };

    it("uses the phone keypad for the mobile number", () => {
      const renderer = renderEdit();

      expect(inputLabelled(renderer.root, "Mobile").props.keyboardType).toBe(
        "phone-pad"
      );
    });

    it("won't save a mobile number that isn't 10 digits", async () => {
      const renderer = renderEdit();

      typeInto(renderer.root, "Mobile", "98765");
      await pressText(renderer.root, "Save changes");

      expect(alerts.titles()).toEqual(["Check the rental details"]);
      expect(alerts.spy.mock.calls[0][1]).toMatch(/10-digit mobile/);
      expect(fakeBackend.documents.get("piano-1")?.rental_customer_mobile).toBe(
        "9876543210"
      );
    });

    it("won't save a rental that ends before it starts", async () => {
      const renderer = renderEdit();

      // The calendar for the end won't offer earlier days, but moving the
      // start past the end makes the same mistake
      await pickDate(renderer.root, "Starts", new Date(2026, 11, 15));
      await pressText(renderer.root, "Save changes");

      expect(alerts.titles()).toEqual(["Check the rental details"]);
      expect(alerts.spy.mock.calls[0][1]).toMatch(/end date must be after/);
      expect(fakeBackend.documents.get("piano-1")?.rental_period_end).toBe(
        "2026-12-01T00:00:00.000+00:00"
      );
    });

    it("checks the same rental details as the Create screen", async () => {
      const renderer = renderEdit();

      typeInto(renderer.root, "Address", "  ");
      await pressText(renderer.root, "Save changes");

      expect(alerts.titles()).toEqual(["Missing Details"]);
      expect(alerts.spy.mock.calls[0][1]).toBe(
        "Please fill all rental details."
      );
      expect(
        fakeBackend.documents.get("piano-1")?.rental_customer_address
      ).toBe("12 MG Road");
    });

    it("saves a mobile number written with the country code", async () => {
      const renderer = renderEdit();

      typeInto(renderer.root, "Mobile", "+91 98765 00000");
      await pressText(renderer.root, "Save changes");

      expect(alerts.titles()).toEqual([]);
      expect(fakeBackend.documents.get("piano-1")?.rental_customer_mobile).toBe(
        "+91 98765 00000"
      );
    });

    it("doesn't offer end dates before the day after the start", async () => {
      const renderer = renderEdit();
      await pressRow(renderer.root, "Ends");
      // The rental starts on Tuesday 1 September 2026 and ends in December
      for (let month = 0; month < 3; month++) {
        await pressLabel(renderer.root, "Previous month");
      }

      const day = (label: string) =>
        renderer.root.find(
          (node) =>
            node.props.accessibilityLabel === label &&
            typeof node.props.onPress === "function"
        );
      expect(day("Tuesday 1 September 2026").props.disabled).toBe(true);
      expect(day("Wednesday 2 September 2026").props.disabled).toBe(false);
    });
  });

  describe("on the Create screen", () => {
    const fillRental = async (mobile: string, startDate: Date, endDate: Date) => {
      jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: "file:///cache/ImagePicker/piano.jpeg",
            fileName: "piano.jpeg",
            width: 800,
            height: 600,
            type: "image",
          },
        ],
      } as any);
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ blob: async () => ({ size: 1000 }) } as any);
      const renderer = renderWithStore(
        <Create />,
        createTestStore({ user: testUser })
      );

      await fillBasics(renderer.root);
      await pressText(renderer.root, "Continue");
      // Rentable is the choice the second step opens with
      typeInto(renderer.root, "Customer", "Asha Mehta");
      typeInto(renderer.root, "Address", "12 MG Road");
      typeInto(renderer.root, "Mobile", mobile);
      // The end first: the calendar only offers days after the start
      await pickDate(renderer.root, "Ends", endDate);
      await pickDate(renderer.root, "Starts", startDate);
      typeInto(renderer.root, "Rent", "4000");

      await pressText(renderer.root, "Continue");
      return renderer;
    };

    it("checks the mobile number before going to review", async () => {
      await fillRental("98765", new Date(2026, 8, 1), new Date(2026, 11, 1));

      expect(alerts.titles()).toEqual(["Check the rental details"]);
      expect(router.push).not.toHaveBeenCalled();
    });

    it("checks the dates before going to review", async () => {
      await fillRental("9876543210", new Date(2026, 11, 1), new Date(2026, 11, 1));

      expect(alerts.titles()).toEqual(["Check the rental details"]);
      expect(router.push).not.toHaveBeenCalled();
    });

    it("goes to review once the rental is valid", async () => {
      const renderer = await fillRental(
        "9876543210",
        new Date(2026, 8, 1),
        new Date(2026, 11, 1)
      );

      expect(alerts.titles()).toEqual([]);
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(inputLabelled(renderer.root, "Mobile").props.keyboardType).toBe(
        "phone-pad"
      );
    });
  });
});

describe("the Add screen", () => {
  // It is a screen of its own above the tabs now, so it needs its own way back
  const open = () =>
    renderWithStore(<Create />, createTestStore({ user: testUser }));

  it("has a Cancel button that returns to where it was opened from", async () => {
    const renderer = open();

    await pressLabel(renderer.root, "Cancel");

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("is titled New piano", () => {
    const renderer = open();

    expect(allTexts(renderer.root)).toContain("New piano");
  });
});

describe("going back to the tabs", () => {
  it("has no leftover screen that pushes another copy of them", () => {
    const appDir = path.join(__dirname, "..", "app");
    expect(fs.existsSync(path.join(appDir, "screens", "review.tsx"))).toBe(
      false
    );

    const sourceFiles = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(full);
        return /\.tsx?$/.test(entry.name) ? [full] : [];
      });
    const pushesToTabs = [
      ...sourceFiles(appDir),
      ...sourceFiles(path.join(__dirname, "..", "components")),
    ].filter((file) =>
      /router\.(push|navigate)\(\s*["'`]\/(home|today|profile|\(tabs\))/.test(
        fs.readFileSync(file, "utf8")
      )
    );
    expect(pushesToTabs).toEqual([]);
  });

  it("keeps the Add screen outside the tabs, so pushing /create doesn't open them again", () => {
    const appDir = path.join(__dirname, "..", "app");

    expect(fs.existsSync(path.join(appDir, "create.tsx"))).toBe(true);
    // A file in the (tabs) folder is served by the tabs layout
    expect(fs.existsSync(path.join(appDir, "(tabs)", "create.tsx"))).toBe(false);
  });
});
