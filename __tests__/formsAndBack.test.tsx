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
  useNavigation: jest.fn(() => ({ setOptions: jest.fn() })),
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
jest.mock("@react-native-picker/picker", () => {
  const React = require("react");
  const Picker = (props: any) =>
    React.createElement("Picker", props, props.children);
  Picker.Item = (props: any) => React.createElement("PickerItem", props);
  return { Picker };
});
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return (props: any) => React.createElement("DateTimePicker", props);
});

import fs from "fs";
import path from "path";
import React from "react";
import { BackHandler } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Home from "@/app/(tabs)/home";
import Create from "@/app/(tabs)/create";
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
  captureAlerts,
  chooseDate as chooseDateIn,
  openDatePicker as openDateField,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";

const field = (renderer: ReactTestRenderer, title: string) => {
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.title === title &&
      typeof candidate.props.handleChangeText === "function"
  );
  if (!node) throw new Error(`No field titled "${title}"`);
  return node;
};

const typeInto = (renderer: ReactTestRenderer, title: string, text: string) =>
  act(() => {
    field(renderer, title).props.handleChangeText(text);
  });

const openDatePicker = (renderer: ReactTestRenderer, title: string) =>
  openDateField(renderer.root, title);

const chooseDate = (renderer: ReactTestRenderer, title: string, date: Date) =>
  chooseDateIn(renderer.root, title, date);

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

      expect(field(renderer, "Customer Mobile Number").props.keyboardType).toBe(
        "phone-pad"
      );
    });

    it("won't save a mobile number that isn't 10 digits", async () => {
      const renderer = renderEdit();

      typeInto(renderer, "Customer Mobile Number", "98765");
      await pressText(renderer.root, "Save Changes");

      expect(alerts.titles()).toEqual(["Check the rental details"]);
      expect(alerts.spy.mock.calls[0][1]).toMatch(/10-digit mobile/);
      expect(fakeBackend.documents.get("piano-1")?.rental_customer_mobile).toBe(
        "9876543210"
      );
    });

    it("won't save a rental that ends before it starts", async () => {
      const renderer = renderEdit();

      chooseDate(renderer, "Rental Period End Date", new Date(2026, 7, 15));
      await pressText(renderer.root, "Save Changes");

      expect(alerts.titles()).toEqual(["Check the rental details"]);
      expect(alerts.spy.mock.calls[0][1]).toMatch(/end date must be after/);
      expect(fakeBackend.documents.get("piano-1")?.rental_period_end).toBe(
        "2026-12-01T00:00:00.000+00:00"
      );
    });

    it("checks the same rental details as the Create screen", async () => {
      const renderer = renderEdit();

      typeInto(renderer, "Customer Address", "  ");
      await pressText(renderer.root, "Save Changes");

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

      typeInto(renderer, "Customer Mobile Number", "+91 98765 00000");
      await pressText(renderer.root, "Save Changes");

      expect(alerts.titles()).toEqual([]);
      expect(fakeBackend.documents.get("piano-1")?.rental_customer_mobile).toBe(
        "+91 98765 00000"
      );
    });

    it("doesn't offer end dates before the day after the start", () => {
      const renderer = renderEdit();

      const picker = openDatePicker(renderer, "Rental Period End Date");

      expect(picker.props.minimumDate.toDateString()).toBe(
        new Date(2026, 8, 2).toDateString()
      );
    });
  });

  describe("on the Create screen", () => {
    const fillRental = async (mobile: string, endDate: Date) => {
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

      act(() => {
        renderer.root
          .findAll((node) => (node.type as unknown) === "Picker")[0]
          .props.onValueChange("rentable");
      });
      await pressText(renderer.root, "Choose a file");
      typeInto(renderer, "Title", "Kawai K-300");
      typeInto(renderer, "Description", "Black polish");
      act(() => {
        renderer.root
          .findAll(
            (node) =>
              typeof node.props.onChange === "function" && node.props.data
          )[0]
          .props.onChange({ label: "Other", value: "Other" });
      });
      act(() => {
        renderer.root
          .findAll((node) => node.props.buttons && node.props.onValueChange)[0]
          .props.onValueChange("Shamshersons");
      });
      typeInto(renderer, "Customer Name", "Asha Mehta");
      typeInto(renderer, "Customer Address", "12 MG Road");
      typeInto(renderer, "Customer Mobile Number", mobile);
      chooseDate(renderer, "Rental Period Start Date", new Date(2026, 8, 1));
      chooseDate(renderer, "Rental Period End Date", endDate);
      typeInto(renderer, "Rent Price", "4000");

      await pressText(renderer.root, "Review & Publish");
      return renderer;
    };

    it("checks the mobile number before going to review", async () => {
      await fillRental("98765", new Date(2026, 11, 1));

      expect(alerts.titles()).toEqual(["Check the rental details"]);
      expect(router.push).not.toHaveBeenCalled();
    });

    it("checks the dates before going to review", async () => {
      await fillRental("9876543210", new Date(2026, 8, 1));

      expect(alerts.titles()).toEqual(["Check the rental details"]);
      expect(router.push).not.toHaveBeenCalled();
    });

    it("goes to review once the rental is valid", async () => {
      const renderer = await fillRental("9876543210", new Date(2026, 11, 1));

      expect(alerts.titles()).toEqual([]);
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(field(renderer, "Customer Mobile Number").props.keyboardType).toBe(
        "phone-pad"
      );
    });
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
      /router\.(push|navigate)\(\s*["'`]\/(home|create|profile|\(tabs\))/.test(
        fs.readFileSync(file, "utf8")
      )
    );
    expect(pushesToTabs).toEqual([]);
  });
});
