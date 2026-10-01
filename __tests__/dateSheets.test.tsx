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
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import MarkAsSoldSheet from "@/components/MarkAsSoldSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  renderWithStore,
} from "./helpers/render";

describe("the date fields of the sheets", () => {
  const piano = makePiano({ category: "rentable", rental_price: 4000 });
  const ALL_BUT_DATE = [
    "hrtime",
    "nextTick",
    "performance",
    "queueMicrotask",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "requestIdleCallback",
    "cancelIdleCallback",
    "setImmediate",
    "clearImmediate",
    "setInterval",
    "clearInterval",
    "setTimeout",
    "clearTimeout",
  ] as const;

  // Fix "today" in the middle of a month, so no test depends on the day it runs
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 8, 15, 12, 0, 0), doNotFake: [...ALL_BUT_DATE] });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const press = (renderer: ReactTestRenderer, label: string) => {
    const [node] = renderer.root.findAll(
      (candidate) =>
        candidate.props.accessibilityLabel === label &&
        typeof candidate.props.onPress === "function"
    );
    if (!node) throw new Error(`Nothing labelled "${label}"`);
    act(() => node.props.onPress());
  };

  it("let the sale date be picked, and not in the future", () => {
    const renderer = renderWithStore(
      <MarkAsSoldSheet piano={piano} visible onClose={jest.fn()} />,
      createTestStore({ user: testUser, items: [piano] })
    );
    expect(allTexts(renderer.root)).toContain("Today, 15 Sep 2026");

    press(renderer, "Sold on, Today, 15 Sep 2026");
    // Tomorrow can't be chosen, today can
    const tomorrow = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Wednesday 16 September 2026"
    )[0];
    expect(tomorrow.props.accessibilityState.disabled).toBe(true);

    press(renderer, "Thursday 3 September 2026");
    press(renderer, "Done");

    expect(allTexts(renderer.root)).toContain("3 Sep 2026");
    expect(allTexts(renderer.root)).not.toContain("Today, 15 Sep 2026");
  });

  it("let the day a payment was made be picked", () => {
    const renderer = renderWithStore(
      <RecordPaymentSheet
        piano={piano}
        visible
        onClose={jest.fn()}
        onSave={jest.fn(() => Promise.resolve(true))}
      />,
      createTestStore({ user: testUser, items: [piano] })
    );

    press(renderer, "Paid on, Today, 15 Sep 2026");
    press(renderer, "Thursday 3 September 2026");
    press(renderer, "Done");

    expect(allTexts(renderer.root)).toContain("3 Sep 2026");
  });
});
