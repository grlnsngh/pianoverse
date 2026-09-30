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
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
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
jest.mock("@/utils/csvExport", () => ({
  exportPianosToCSV: jest.fn(() => Promise.resolve()),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act } from "react-test-renderer";
import { addDays, format, subDays } from "date-fns";
import { router } from "expo-router";
import Profile from "@/app/(tabs)/profile";
import SignOutSheet from "@/components/SignOutSheet";
import { useGlobalContext } from "@/context/GlobalProvider";
import * as appwrite from "@/lib/appwrite";
import { savePianosToCache } from "@/lib/pianoCache";
import { setActiveTab } from "@/redux/navigation/actions";
import { getRentalReminderTimes, scheduleAllRentalNotifications } from "@/services/notifications";
import { formatLastUpdated } from "@/utils/account";
import { exportPianosToCSV } from "@/utils/csvExport";
import { toStoredDate } from "@/utils/dates";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  flushPromises,
  pressLabel,
  pressText,
  renderWithStore,
} from "./helpers/render";

const inDays = (days: number) => toStoredDate(addDays(new Date(), days)) as any;

const rental = (id: string, endInDays: number, extra = {}) =>
  makePiano({
    $id: id,
    title: `Rental ${id}`,
    category: "rentable",
    rental_customer_name: "Asha",
    rental_period_start: inDays(endInDays - 60),
    rental_period_end: inDays(endInDays),
    rental_price: 4000,
    ...extra,
  });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  fakeBackend.reset();
  fakeNotifications.reset();
  // The user every test is signed in as, with an account made long ago
  (useGlobalContext() as any).user = {
    ...testUser,
    username: "grlnsngh",
    email: "grlnsngh@gmail.com",
    $createdAt: subDays(new Date(), 400).toISOString(),
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

const renderAccount = async (items = [makePiano()]) => {
  const store = createTestStore({ user: testUser, items });
  const renderer = renderWithStore(<Profile />, store);
  await flushPromises();
  return { store, renderer };
};

describe("the profile card", () => {
  it("shows who is signed in, in an orange circle with their initial", async () => {
    const { renderer } = await renderAccount();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Account");
    expect(texts).toContain("G");
    expect(texts).toContain("grlnsngh");
    expect(texts).toContain("grlnsngh@gmail.com");
  });

  it("says how long they have been a member", async () => {
    const { renderer } = await renderAccount();

    const since = format(subDays(new Date(), 400), "MMM yyyy");
    expect(allTexts(renderer.root)).toContain(`Member for 1 year · since ${since}`);
  });

  it("leaves the line out when the account's date isn't known", async () => {
    (useGlobalContext() as any).user.$createdAt = undefined;
    const { renderer } = await renderAccount();

    expect(allTexts(renderer.root).join(" ")).not.toContain("Member for");
  });

  it("counts what is here, what is out on rent and what sold this month", async () => {
    const soldThisMonth = makePiano({
      $id: "sold",
      sold_date: toStoredDate(new Date()) as any,
      sold_price: 50000,
    });
    const { renderer } = await renderAccount([
      makePiano({ $id: "a" }),
      makePiano({ $id: "b" }),
      rental("out", 20),
      soldThisMonth,
    ]);

    const texts = allTexts(renderer.root);
    expect(texts[texts.indexOf("In stock") - 1]).toBe("2");
    expect(texts[texts.indexOf("On rent") - 1]).toBe("1");
    expect(texts[texts.indexOf("Sold this month") - 1]).toBe("1");
  });

  it("reads each count out with its name", async () => {
    const { renderer } = await renderAccount([makePiano()]);

    const labels = renderer.root
      .findAll((node) => typeof node.props.accessibilityLabel === "string")
      .map((node) => node.props.accessibilityLabel);
    expect(labels).toEqual(
      expect.arrayContaining(["In stock, 1", "On rent, 0", "Sold this month, 0"])
    );
  });
});

describe("your data", () => {
  it("downloads the piano list as a CSV file", async () => {
    const items = [makePiano({ $id: "a" }), makePiano({ $id: "b" })];
    const { renderer } = await renderAccount(items);

    expect(allTexts(renderer.root)).toContain("CSV file. Sold pianos are marked Sold.");
    await pressLabel(renderer.root, "Download piano list. CSV file. Sold pianos are marked Sold.");

    expect(exportPianosToCSV).toHaveBeenCalledWith(items);
  });

  it("shows it is working, and can't be pressed again, while the file is made", async () => {
    let finish: () => void = () => {};
    jest
      .mocked(exportPianosToCSV)
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    const { renderer } = await renderAccount();
    const label = "Download piano list. CSV file. Sold pianos are marked Sold.";
    const row = () =>
      renderer.root.find(
        (node) =>
          node.props.accessibilityLabel === label &&
          typeof node.props.onPress === "function"
      );

    act(() => {
      row().props.onPress();
    });

    expect(row().props.disabled).toBe(true);
    await act(async () => finish());
    expect(row().props.disabled).toBe(false);
  });

  it("says when the pianos on the phone were last saved", async () => {
    const saved = await savePianosToCache(testUser.accountId, [makePiano()]);
    const { renderer } = await renderAccount();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Last updated");
    expect(texts).toContain("Saved on this device for offline use");
    expect(texts).toContain(formatLastUpdated(saved!.savedAt));
  });

  it("says Not yet when nothing has been saved", async () => {
    const { renderer } = await renderAccount();

    expect(allTexts(renderer.root)).toContain("Not yet");
  });

  it("reads the saved copy again when the tab is shown", async () => {
    const { store, renderer } = await renderAccount();
    expect(allTexts(renderer.root)).toContain("Not yet");

    const saved = await savePianosToCache(testUser.accountId, [makePiano()]);
    await act(async () => {
      store.dispatch(setActiveTab("account") as any);
    });
    await flushPromises();

    expect(allTexts(renderer.root)).toContain(formatLastUpdated(saved!.savedAt));
  });
});

describe("rental reminders", () => {
  it("explains them, with a sample of what arrives", async () => {
    const { renderer } = await renderAccount();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Rental reminders");
    expect(texts).toContain("Know before a rental ends");
    expect(texts).toContain(
      "You get a notification at 9:00 AM when a rental is about to end. Tap it to open that piano."
    );
    expect(texts).toContain("Piano Rental Due Soon!");
    expect(texts).toContain("9:00 AM");
    expect(texts).toContain(
      "“Young Chang U-121” rental ends tomorrow. Please arrange return or extension."
    );
  });

  it("describes the reminders the app really sends", async () => {
    // What it says: 7 days before, 1 day before, the day it ends, then 1 and 7 days after
    const due = new Date(2030, 5, 15);
    const days = getRentalReminderTimes(due, new Date(2030, 0, 1)).map(
      ({ daysBefore }) => daysBefore
    );
    expect(days).toEqual([7, 1, 0, -1, -7]);
    const { renderer } = await renderAccount();
    expect(allTexts(renderer.root)).toContain(
      "Sent 7 days before, 1 day before and on the day it ends. If the rental isn’t extended, again 1 day and 7 days after."
    );

    // And the sample is worded like the one sent a day before
    // A rental ending in 10 days has its "1 day before" reminder still ahead
    await scheduleAllRentalNotifications([
      rental("sample", 10, { title: "Young Chang U-121" }),
    ]);
    const [dayBefore] = fakeNotifications
      .rentalReminders("sample")
      .filter((notification) => notification.content.body.includes("ends tomorrow"));
    const sample = allTexts(renderer.root).find((text) => text.includes("ends tomorrow"))!;
    expect(dayBefore).toBeTruthy();
    expect(sample.replace(/[“”]/g, '"')).toBe(dayBefore.content.body);
  });
});

describe("signing out", () => {
  const openSheet = async () => {
    const result = await renderAccount();
    await pressLabel(result.renderer.root, "Sign out");
    return result;
  };

  const sheet = (renderer: any) => renderer.root.findByType(SignOutSheet);

  it("is a red row at the bottom", async () => {
    const { renderer } = await renderAccount();

    const [row] = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Sign out" && typeof node.props.onPress === "function"
    );
    expect(row).toBeTruthy();
    expect(sheet(renderer).props.visible).toBe(false);
  });

  it("asks first, and says what will be cleared", async () => {
    const { renderer } = await openSheet();

    expect(sheet(renderer).props.visible).toBe(true);
    const texts = allTexts(renderer.root);
    expect(texts).toContain("Sign out of Pianoverse?");
    expect(texts).toContain(
      "Pianos and reminders saved on this device will be cleared. Everything stays in your account."
    );
    expect(texts).toContain("Cancel");
  });

  it("does nothing when cancelled", async () => {
    const signOut = jest.spyOn(appwrite, "signOut");
    const { renderer } = await openSheet();

    await pressText(renderer.root, "Cancel");

    expect(sheet(renderer).props.visible).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows Signing out on the red button until it has finished", async () => {
    let finish: () => void = () => {};
    jest
      .spyOn(appwrite, "signOut")
      .mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)) as any);
    const { renderer } = await openSheet();
    const buttons = renderer.root.findAll(
      (node: any) =>
        node.props.accessibilityRole === "button" &&
        typeof node.props.onPress === "function" &&
        node.props.children !== undefined &&
        allTexts(node).includes("Sign out")
    );
    const confirm = buttons[buttons.length - 1];

    act(() => {
      confirm.props.onPress();
    });
    expect(sheet(renderer).props.signingOut).toBe(true);
    expect(allTexts(renderer.root)).toContain("Signing out");

    await act(async () => finish());
    await flushPromises();

    expect(router.replace).toHaveBeenCalledWith("/");
    expect(sheet(renderer).props.signingOut).toBe(false);
    expect(sheet(renderer).props.visible).toBe(false);
  });

  it("closes the sheet and says why when signing out fails", async () => {
    const alerts = captureAlerts();
    fakeBackend.signOutError = new Error("Network request failed");
    const { renderer } = await openSheet();

    await act(async () => {
      sheet(renderer).props.onConfirm();
    });
    await flushPromises();

    expect(alerts.titles()).toEqual(["Sign Out Failed"]);
    expect(sheet(renderer).props.visible).toBe(false);
    expect(sheet(renderer).props.signingOut).toBe(false);
  });
});
