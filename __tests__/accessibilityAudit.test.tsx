const mockContext = {
  user: null as any,
  setUser: jest.fn(),
  setIsLogged: jest.fn(),
  loading: false,
  isLogged: true,
};

jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
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
  useNavigation: jest.fn(() => ({ setOptions: jest.fn(), addListener: jest.fn(() => jest.fn()) })),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => mockContext,
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

import React from "react";
import { AccessibilityInfo, Platform, Pressable, Text } from "react-native";
import { addDays } from "date-fns";
import { act } from "react-test-renderer";
import { Provider } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import Home from "@/app/(tabs)/home";
import Profile from "@/app/(tabs)/profile";
import Today from "@/app/(tabs)/today";
import ForgetPassword from "@/app/(auth)/forget-password";
import ResetPassword from "@/app/(auth)/reset-password";
import SignIn from "@/app/(auth)/sign-in";
import SignUp from "@/app/(auth)/sign-up";
import Create from "@/app/create";
import DetailScreen from "@/app/detail/[id]";
import EditScreen from "@/app/edit/[id]";
import Review from "@/app/review";
import FilterSheet from "@/components/FilterSheet";
import MakePickerSheet from "@/components/MakePickerSheet";
import NotifyPrimerSheet from "@/components/NotifyPrimerSheet";
import PianoActionsSheet from "@/components/PianoActionsSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import SignOutSheet from "@/components/SignOutSheet";
import WelcomeScreen from "@/components/WelcomeScreen";
import { Dialog, DatePickerSheet } from "@/components/ui";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import * as Notifications from "expo-notifications";
import { PianoDataContext } from "@/lib/PianoDataContext";
import { menuActions } from "@/utils/pianoDetail";
import { setPianoFilters } from "@/redux/pianos/actions";
import { createEmptyPianoForm } from "@/utils/pianoForm";
import { toStoredDate } from "@/utils/dates";
import { showToast } from "@/utils/toast";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import { createTestStore, flushPromises, renderWithStore, TestStore } from "./helpers/render";

const inDays = (days: number) => toStoredDate(addDays(new Date(), days)) as any;

const rental = makePiano({
  $id: "piano-1",
  title: "Young Chang U-121",
  category: "rentable",
  rental_customer_name: "Meera Kapoor",
  rental_customer_mobile: "9876543210",
  rental_customer_address: "B-42, Sector 21",
  rental_period_start: inDays(-30),
  rental_period_end: inDays(5),
  rental_price: 4500,
});
const forSale = makePiano({ $id: "piano-2", title: "Kreutzer K-108", category: "on_sale", on_sale_price: 95000 });
const warehouse = makePiano({ $id: "piano-3", title: "Ronish R-112", category: "warehouse" });
const pianos = [rental, forSale, warehouse];

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  mockContext.user = testUser;
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  pianos.forEach((piano) => fakeBackend.documents.set(piano.$id, { ...piano }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

const audit = (renderer: ReturnType<typeof renderWithStore>) =>
  describeProblems(a11yProblems(renderer.root));

const inData = (ui: React.ReactElement, store: TestStore) => (
  <Provider store={store}>
    <PianoDataContext.Provider
      value={{ status: "ready", reportStatus: jest.fn(), refresher: { current: null } }}
    >
      {ui}
    </PianoDataContext.Provider>
  </Provider>
);

const withStore = () => createTestStore({ user: testUser, items: pianos });

describe("launch and sign in", () => {
  it("has a welcome screen a screen reader and a thumb can use", () => {
    expect(audit(renderWithStore(<WelcomeScreen />, createTestStore()))).toEqual([]);
  });

  it.each([
    ["Sign in", <SignIn key="a" />],
    ["Create account", <SignUp key="b" />],
    ["Reset password", <ForgetPassword key="c" />],
  ])("has a %s screen a screen reader and a thumb can use", (_name, screen) => {
    expect(audit(renderWithStore(screen, createTestStore()))).toEqual([]);
  });

  it("has a screen for choosing the new password a screen reader and a thumb can use", () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ userId: "u", secret: "s" });

    expect(audit(renderWithStore(<ResetPassword />, createTestStore()))).toEqual([]);
  });
});

describe("the tabs", () => {
  it("has an Account tab a screen reader and a thumb can use", () => {
    expect(audit(renderWithStore(<Profile />, withStore()))).toEqual([]);
  });

  it("has a Today tab a screen reader and a thumb can use", async () => {
    const store = withStore();
    const renderer = renderWithStore(inData(<Today />, store), store);
    await flushPromises();

    expect(audit(renderer)).toEqual([]);
  });

  it.each(["grid", "list"] as const)("has a Pianos tab in the %s layout a screen reader and a thumb can use", async (layout) => {
    const store = withStore();
    const renderer = renderWithStore(inData(<Home />, store), store);
    await flushPromises();
    act(() => {
      store.dispatch(
        setPianoFilters({
          ...DEFAULT_FILTERS,
          layoutStatus: { grid: layout === "grid" ? "checked" : "unchecked", list: layout === "list" ? "checked" : "unchecked", card: "unchecked" },
        }) as any
      );
    });

    expect(audit(renderer)).toEqual([]);
  });
});

describe("a piano's page", () => {
  it.each([rental, forSale, warehouse])("is usable for %#", async (piano) => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: piano.$id });
    const store = withStore();
    const renderer = renderWithStore(inData(<DetailScreen />, store), store);
    await flushPromises();

    expect(audit(renderer)).toEqual([]);
  });
});

describe("the Add and Edit screens", () => {
  const photo = { uri: "file:///cache/one.jpeg", fileName: "one.jpeg", fileSize: 1000 };

  it("has a first step a screen reader and a thumb can use", () => {
    expect(audit(renderWithStore(<Create />, createTestStore({ user: testUser })))).toEqual([]);
  });

  it("has a review a screen reader and a thumb can use", () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({
      formData: JSON.stringify({ ...createEmptyPianoForm(), category: "warehouse", title: "Ronish", make: "Ronish", companyAssociated: "Kirpalsons", description: "Tuned", photos: [photo] }),
    });

    expect(audit(renderWithStore(<Review />, createTestStore({ user: testUser })))).toEqual([]);
  });

  it("has an Edit screen a screen reader and a thumb can use", () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "piano-1" });

    expect(audit(renderWithStore(<EditScreen />, withStore()))).toEqual([]);
  });
});

describe("sheets and dialogs", () => {
  it("has a filter sheet that is usable", () => {
    expect(
      audit(renderWithStore(<FilterSheet visible onClose={() => {}} />, withStore()))
    ).toEqual([]);
  });

  it("has a record payment sheet that is usable", () => {
    expect(
      audit(renderWithStore(<RecordPaymentSheet piano={rental} visible onClose={() => {}} onSave={jest.fn()} />, withStore()))
    ).toEqual([]);
  });

  it("has a list of a piano's actions that is usable", () => {
    expect(
      audit(
        renderWithStore(
          <PianoActionsSheet
            visible
            onClose={() => {}}
            actions={menuActions(rental)}
            onSelect={() => {}}
          />,
          withStore()
        )
      )
    ).toEqual([]);
  });

  it("has a make picker that is usable", () => {
    expect(
      audit(
        renderWithStore(
          <MakePickerSheet visible makes={["Yamaha", "Kawai", "Weber"]} value="Kawai" onSelect={() => {}} onClose={() => {}} />,
          createTestStore()
        )
      )
    ).toEqual([]);
  });

  it("has a calendar that is usable", () => {
    expect(
      audit(
        renderWithStore(
          <DatePickerSheet visible title="Starts" value={new Date(2026, 8, 29)} onSelect={() => {}} onClose={() => {}} />,
          createTestStore()
        )
      )
    ).toEqual([]);
  });

  it("has a dialog that is usable", () => {
    expect(
      audit(
        renderWithStore(
          <Dialog
            visible
            title="Delete Kawai K-300?"
            actions={[
              { label: "Delete", tone: "destructive", onPress: () => {} },
              { label: "Cancel", emphasis: true, onPress: () => {} },
            ]}
          />,
          createTestStore()
        )
      )
    ).toEqual([]);
  });

  it("has a sign out sheet that is usable", () => {
    expect(
      audit(
        renderWithStore(
          <SignOutSheet visible signingOut={false} onConfirm={() => {}} onClose={() => {}} />,
          createTestStore()
        )
      )
    ).toEqual([]);
  });

  it("has a reminders sheet that is usable", async () => {
    // It is only shown on a phone that hasn't been asked about notifications
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: "undetermined" } as any);
    const renderer = renderWithStore(<NotifyPrimerSheet />, withStore());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
    });

    expect(renderer.root.findAll((node) => node.props.testID === "notify-primer").length).toBeGreaterThan(0);
    expect(audit(renderer)).toEqual([]);
  });
});

describe("the audit itself", () => {
  const audited = (ui: React.ReactElement) =>
    describeProblems(a11yProblems(renderWithStore(ui, createTestStore()).root));

  it("catches a button with nothing to read out", () => {
    expect(
      audited(<Pressable onPress={() => {}} accessibilityRole="button" style={{ height: 44, width: 44 }} />)
    ).toEqual(["(unnamed): has no name to read out"]);
  });

  it("catches a pressable that doesn't say what it is", () => {
    expect(audited(<Pressable onPress={() => {}} accessibilityLabel="Share" />)).toEqual([
      "Share: has no role (button, link, tab...)",
    ]);
  });

  it("catches a target smaller than 44 px, less what hitSlop adds", () => {
    const small = (extra: object = {}) => (
      <Pressable
        onPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={{ height: 40, width: 40 }}
        {...extra}
      />
    );

    expect(audited(small())).toEqual([
      "Close: is 40 px high (the least is 44)",
      "Close: is 40 px wide (the least is 44)",
    ]);
    expect(audited(small({ hitSlop: 2 }))).toEqual([]);
  });

  it("reads the name from the words inside when there is no label", () => {
    expect(
      audited(
        <Pressable onPress={() => {}} accessibilityRole="button">
          <Text>Continue</Text>
        </Pressable>
      )
    ).toEqual([]);
  });

  it("leaves out what is hidden from screen readers on purpose", () => {
    expect(
      audited(
        <Pressable accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Pressable onPress={() => {}} />
        </Pressable>
      )
    ).toEqual([]);
  });
});

describe("toasts", () => {
  afterEach(() => {
    jest.replaceProperty(Platform, "OS", "ios");
  });

  it("are read out by VoiceOver on iOS, which has no live regions", () => {
    jest.replaceProperty(Platform, "OS", "ios");
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});

    showToast("Payment recorded", { variant: "success" });

    expect(announce).toHaveBeenCalledWith("Payment recorded");
  });

  it("are left to their live region on Android, so they are not read twice", () => {
    jest.replaceProperty(Platform, "OS", "android");
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});

    showToast("Payment recorded", { variant: "success" });

    expect(announce).not.toHaveBeenCalled();
  });
});
