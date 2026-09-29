import React from "react";
import { Alert, AlertButton } from "react-native";
import { PaperProvider } from "react-native-paper";
import { Provider } from "react-redux";
import {
  act,
  create,
  ReactTestInstance,
  ReactTestRenderer,
} from "react-test-renderer";
import { combineReducers, createStore } from "redux";
import navigationReducer from "@/redux/navigation/reducer";
import paymentsReducer from "@/redux/payments/reducer";
import pianoReducer from "@/redux/pianos/reducer";
import userReducer from "@/redux/users/reducers";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { setToastListener } from "@/utils/toast";

export const createTestStore = ({
  user = null,
  items = [],
}: { user?: any; items?: PianoItem[] } = {}) =>
  createStore(
    combineReducers({
      users: userReducer,
      pianos: pianoReducer,
      navigation: navigationReducer,
      payments: paymentsReducer,
    }),
    {
      users: { user, isAuthenticated: !!user },
      pianos: {
        items,
        filteredItems: items,
        filters: DEFAULT_FILTERS,
        isBulkSelectionMode: false,
        selectedItems: [],
      },
      navigation: { activeTab: "home", createFormResetCount: 0 },
      payments: { changeCount: 0 },
    } as any
  );

export type TestStore = ReturnType<typeof createTestStore>;

const mountedRenderers = new Set<ReactTestRenderer>();

export const renderWithStore = (ui: React.ReactElement, store: TestStore) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <Provider store={store}>
        {/* Like the root layout */}
        <PaperProvider>{ui}</PaperProvider>
      </Provider>
    );
  });
  mountedRenderers.add(renderer);
  return renderer;
};

afterEach(() => {
  mountedRenderers.forEach((renderer) => act(() => renderer.unmount()));
  mountedRenderers.clear();
});

// Let press-feedback animations finish before Jest tears the environment down.
afterAll(() => new Promise((resolve) => setTimeout(resolve, 500)));

/** Let pending promises (awaited inside press handlers and effects) settle. */
export const flushPromises = async (rounds = 10) => {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });
  }
};

const textOf = (node: ReactTestInstance): string =>
  node.children
    .map((child) => (typeof child === "string" ? child : textOf(child)))
    .join("");

const isHostText = (node: ReactTestInstance) =>
  (node.type as unknown) === "Text";

/** Host <Text> nodes whose full text equals `text`. */
export const queryAllByText = (root: ReactTestInstance, text: string) =>
  root.findAll((node) => isHostText(node) && textOf(node) === text);

export const allTexts = (root: ReactTestInstance) =>
  root.findAll(isHostText).map((node) => textOf(node));

const findPressable = (node: ReactTestInstance) => {
  let current: ReactTestInstance | null = node;
  while (current && typeof current.props.onPress !== "function") {
    current = current.parent;
  }
  if (!current) throw new Error("No pressable ancestor found");
  return current;
};

export const press = async (node: ReactTestInstance) => {
  const pressable = findPressable(node);
  await act(async () => {
    await pressable.props.onPress();
  });
  await flushPromises();
};

export const pressText = async (root: ReactTestInstance, text: string) => {
  const [node] = queryAllByText(root, text);
  if (!node) throw new Error(`No element with text "${text}"`);
  await press(node);
};

/** First element rendering the given image source (e.g. an icon or a { uri }). */
export const findByImageSource = (
  root: ReactTestInstance,
  matches: (source: any) => boolean
) => {
  const [node] = root.findAll(
    (candidate) => candidate.props.source != null && matches(candidate.props.source)
  );
  if (!node) throw new Error("No element with a matching image source");
  return node;
};

/**
 * Captures Alert.alert calls so tests can inspect the message and press one of
 * the dialog buttons, like a user would.
 */
export const captureAlerts = () => {
  const spy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const lastCall = () => {
    const call = spy.mock.calls[spy.mock.calls.length - 1];
    if (!call) throw new Error("No alert was shown");
    return call;
  };
  return {
    spy,
    titles: () => spy.mock.calls.map((call) => call[0]),
    pressButton: async (text: string) => {
      const buttons = (lastCall()[2] ?? []) as AlertButton[];
      const button = buttons.find((candidate) => candidate.text === text);
      if (!button) throw new Error(`Alert has no "${text}" button`);
      await act(async () => {
        await button.onPress?.();
      });
      await flushPromises();
    },
  };
};

/** Collects messages passed to showToast (tests run as iOS). */
export const captureToasts = () => {
  const messages: string[] = [];
  setToastListener((message) => messages.push(message));
  return messages;
};
