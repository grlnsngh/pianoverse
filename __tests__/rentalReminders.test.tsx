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
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn() })),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@react-native-picker/picker", () => {
  const React = require("react");
  const Picker = (props: any) => React.createElement("Picker", props, props.children);
  Picker.Item = (props: any) => React.createElement("PickerItem", props);
  return { Picker };
});
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return (props: any) => React.createElement("DateTimePicker", props);
});

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import { addDays, format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import EditScreen from "@/app/edit/[id]";
import Review from "@/app/review";
import {
  handleNotificationResponse,
  scheduleAllRentalNotifications,
} from "@/app/services/notifications";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import * as appwrite from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications, reminderTapFor } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";

const day = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");

const rental = (end: string, overrides: Partial<PianoItem> = {}) =>
  makePiano({
    category: "rentable",
    rental_customer_name: "Asha",
    rental_customer_address: "Delhi",
    rental_customer_mobile: "9999999999",
    rental_price: 5000,
    rental_period_start: "2026-01-01" as any,
    rental_period_end: end as any,
    ...overrides,
  });

const reminderTimes = (pianoId?: string) =>
  fakeNotifications
    .rentalReminders(pianoId)
    .map((notification) => new Date(notification.trigger.date))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((date) => format(date, "yyyy-MM-dd HH:mm"));

beforeEach(() => {
  jest.clearAllMocks();
  fakeNotifications.reset();
  fakeBackend.reset();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("scheduling", () => {
  const setNow = (date: Date) => {
    jest.useFakeTimers({
      now: date,
      doNotFake: ["nextTick", "setImmediate", "setTimeout", "queueMicrotask"],
    });
  };

  it("keeps the same reminder times when the app is opened again the next day", async () => {
    const dueSoon = rental("2026-10-04");

    setNow(new Date(2026, 9, 1, 10, 0));
    await scheduleAllRentalNotifications([dueSoon]);
    const firstDay = reminderTimes();

    setNow(new Date(2026, 9, 2, 10, 0));
    await scheduleAllRentalNotifications([dueSoon]);

    expect(firstDay).toEqual(["2026-10-03 09:00", "2026-10-04 09:00"]);
    expect(reminderTimes()).toEqual(firstDay);
  });

  it("reminds a week before, the day before and on the due date", async () => {
    setNow(new Date(2026, 9, 1, 10, 0));

    await scheduleAllRentalNotifications([rental("2026-10-20")]);

    expect(reminderTimes()).toEqual([
      "2026-10-13 09:00",
      "2026-10-19 09:00",
      "2026-10-20 09:00",
    ]);
    expect(fakeNotifications.rentalReminders()[0].content.body).toBe(
      '"Yamaha U1" rental ends in 7 days. Please arrange return or extension.'
    );
  });

  it("removes reminders once there are no rentals left", async () => {
    await scheduleAllRentalNotifications([rental(day(20))]);
    expect(reminderTimes()).not.toEqual([]);

    await scheduleAllRentalNotifications([]);

    expect(reminderTimes()).toEqual([]);
  });

  it("removes reminders for a piano that is no longer rented out", async () => {
    await scheduleAllRentalNotifications([rental(day(20))]);

    await scheduleAllRentalNotifications([
      rental(day(20), { category: "warehouse" }),
    ]);

    expect(reminderTimes()).toEqual([]);
  });

  it("does not duplicate reminders when two refreshes overlap", async () => {
    const pianos = [rental(day(20))];

    await Promise.all([
      scheduleAllRentalNotifications(pianos),
      scheduleAllRentalNotifications(pianos),
    ]);

    expect(reminderTimes()).toHaveLength(3);
  });
});

describe("tapping a reminder", () => {
  it("opens the piano", () => {
    handleNotificationResponse(reminderTapFor("piano-1") as any);

    expect(router.push).toHaveBeenCalledWith("/detail/piano-1");
  });

  let context: any;
  const CaptureContext = () => {
    context = useGlobalContext();
    return null;
  };
  const renderProvider = async (signedInUser: any) => {
    jest.spyOn(appwrite, "getCurrentUser").mockResolvedValue(signedInUser);
    const renderer = renderWithStore(
      <GlobalProvider>
        <CaptureContext />
      </GlobalProvider>,
      createTestStore()
    );
    await flushPromises();
    return renderer;
  };

  it("opens the piano when a reminder is tapped while the app is open", async () => {
    await renderProvider(testUser);

    act(() => {
      fakeNotifications.tap(reminderTapFor("piano-1"));
    });

    expect(router.push).toHaveBeenCalledWith("/detail/piano-1");
  });

  it("opens the piano when the app was started by tapping a reminder", async () => {
    fakeNotifications.lastResponse = reminderTapFor("piano-1");

    await renderProvider(testUser);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/detail/piano-1");
  });

  it("waits until someone signs in before opening the piano", async () => {
    await renderProvider(null);

    act(() => {
      fakeNotifications.tap(reminderTapFor("piano-1"));
    });
    expect(router.push).not.toHaveBeenCalled();

    act(() => {
      context.setUser(testUser);
      context.setIsLogged(true);
    });

    expect(router.push).toHaveBeenCalledWith("/detail/piano-1");
  });

  it("stops listening for notifications when the provider goes away", async () => {
    const renderer = await renderProvider(testUser);
    expect(fakeNotifications.responseListeners.size).toBe(1);

    act(() => renderer.unmount());

    expect(fakeNotifications.responseListeners.size).toBe(0);
    expect(fakeNotifications.receivedListeners.size).toBe(0);
  });
});

describe("publishing and editing", () => {
  const hostNodes = (renderer: ReactTestRenderer, type: string) =>
    renderer.root.findAll((node) => (node.type as unknown) === type);

  it("schedules reminders for a newly published rental", async () => {
    const endDate = addDays(new Date(), 20);
    const form = {
      category: "rentable",
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
      rentalCustomerName: "Asha",
      rentalCustomerAddress: "Delhi",
      rentalCustomerMobileNumber: "9999999999",
      rentalStartDate: new Date(),
      rentalEndDate: endDate,
      rentalPrice: 5000,
    };
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ formData: JSON.stringify(form) });
    jest.spyOn(appwrite, "getCurrentUser").mockResolvedValue(testUser as any);
    const renderer = renderWithStore(
      <GlobalProvider>
        <Review />
      </GlobalProvider>,
      createTestStore()
    );
    await flushPromises();

    await pressText(renderer.root, "Publish");

    const [created] = [...fakeBackend.documents.values()];
    expect(created).toMatchObject({ title: "Kawai K-300" });
    expect(reminderTimes(created.$id)).toContain(
      `${format(endDate, "yyyy-MM-dd")} 09:00`
    );
  });

  const renderEdit = async (piano: PianoItem) => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: piano.$id });
    fakeBackend.documents.set(piano.$id, { ...piano });
    await scheduleAllRentalNotifications([piano]);
    return renderWithStore(
      <EditScreen />,
      createTestStore({ user: testUser, items: [piano] })
    );
  };

  it("moves the reminders when the rental end date is changed", async () => {
    captureAlerts();
    const renderer = await renderEdit(rental(day(20)));
    const newEnd = addDays(new Date(), 40);

    act(() => {
      renderer.root
        .findAll((node) => node.props.title === "Rental Period End Date" && node.props.onFocus)[0]
        .props.onFocus();
    });
    act(() => {
      hostNodes(renderer, "DateTimePicker")[0].props.onChange({ type: "set" }, newEnd);
    });
    await pressText(renderer.root, "Save Changes");

    expect(reminderTimes("piano-1")).toContain(`${format(newEnd, "yyyy-MM-dd")} 09:00`);
    expect(reminderTimes("piano-1")).not.toContain(`${day(20)} 09:00`);
  });

  it("removes the reminders when the piano is no longer rented out", async () => {
    captureAlerts();
    const renderer = await renderEdit(rental(day(20)));

    act(() => {
      hostNodes(renderer, "Picker")[0].props.onValueChange("warehouse");
    });
    await pressText(renderer.root, "Save Changes");

    expect(reminderTimes("piano-1")).toEqual([]);
  });
});
