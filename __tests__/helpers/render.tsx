import { differenceInCalendarMonths, format, parse } from "date-fns";
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
import navigationReducer, { INITIAL_TAB } from "@/redux/navigation/reducer";
import paymentsReducer from "@/redux/payments/reducer";
import pianoReducer from "@/redux/pianos/reducer";
import userReducer from "@/redux/users/reducers";
import DialogHost from "@/components/DialogHost";
import MakePickerSheet from "@/components/MakePickerSheet";
import DatePickerSheet from "@/components/ui/DatePickerSheet";
import PickerSheet from "@/components/ui/PickerSheet";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { categoryLabelOf } from "@/utils/pianoDisplay";
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
      navigation: { activeTab: INITIAL_TAB, createFormResetCount: 0 },
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
        <PaperProvider>
          {ui}
          <DialogHost />
        </PaperProvider>
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

/**
 * Presses the button with this text, skipping a heading that says the same
 * ("Create account" is both a title and a button): the last text of that name
 * that is inside something pressable.
 */
export const pressButton = async (root: ReactTestInstance, text: string) => {
  const pressable = (node: ReactTestInstance) => {
    let current: ReactTestInstance | null = node;
    while (current && typeof current.props.onPress !== "function") current = current.parent;
    return !!current;
  };
  const node = queryAllByText(root, text).filter(pressable).pop();
  if (!node) throw new Error(`No button with text "${text}"`);
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

/**
 * The dialog on screen (the app's own, drawn by DialogHost, not a system
 * alert), or null: its title, its message and the labels of its choices in
 * the order they are drawn.
 */
export const dialogOf = (root: ReactTestInstance) => {
  const [card] = root.findAll(
    (node) => typeof node.type === "string" && node.props.testID === "dialog-card"
  );
  if (!card) return null;
  const actions = [
    ...new Set(
      card
        .findAll(
          (node) =>
            typeof node.props.onPress === "function" &&
            typeof node.props.accessibilityLabel === "string"
        )
        .map((node) => node.props.accessibilityLabel as string)
    ),
  ];
  const words = card
    .findAll(isHostText)
    .map(textOf)
    .filter((text) => !actions.includes(text));
  return { title: words[0], message: words[1], actions };
};

/** Presses a choice of the dialog on screen. */
export const pressDialog = async (root: ReactTestInstance, label: string) => {
  const [card] = root.findAll(
    (node) => typeof node.type === "string" && node.props.testID === "dialog-card"
  );
  if (!card) throw new Error("No dialog is showing");
  const [row] = card.findAll(
    (node) =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === "function"
  );
  if (!row) throw new Error(`The dialog has no "${label}" choice`);
  await act(async () => {
    await row.props.onPress();
  });
};

/** Everything passed to showToast: the message, how long, and its variant and button. */
export const captureToastCalls = () => {
  const calls: {
    message: string;
    duration: string;
    variant?: string;
    action?: { label: string; onPress: () => void };
  }[] = [];
  setToastListener((message, duration, details) =>
    calls.push({ message, duration, ...details })
  );
  return calls;
};

/** Collects messages passed to showToast. */
export const captureToasts = () => {
  const messages: string[] = [];
  setToastListener((message) => messages.push(message));
  return messages;
};

/** Taps the date field titled `title` and returns the date picker it opens. */
export const openDatePicker = (root: ReactTestInstance, title: string) => {
  const [field] = root.findAll(
    (node) =>
      node.props.accessibilityLabel === title &&
      typeof node.props.onPress === "function"
  );
  if (!field) throw new Error(`No date field titled "${title}"`);
  act(() => {
    field.props.onPress();
  });
  const [picker] = root.findAll(
    (node) => (node.type as unknown) === "DateTimePicker"
  );
  if (!picker) throw new Error(`"${title}" didn't open the date picker`);
  return picker;
};

/** Picks `date` in the date field titled `title`, like a user would. */
export const chooseDate = (root: ReactTestInstance, title: string, date: Date) => {
  const picker = openDatePicker(root, title);
  act(() => {
    picker.props.onChange({ type: "set" }, date);
  });
};

const buttonsLabelled = (
  root: ReactTestInstance,
  matches: (label: string) => boolean
) =>
  root.findAll(
    (node) =>
      typeof node.props.accessibilityLabel === "string" &&
      matches(node.props.accessibilityLabel) &&
      typeof node.props.onPress === "function"
  );

/**
 * Presses the button whose accessibility label is `label`. When a sheet that is
 * closing (its exit animation never finishes in tests) and the one on top of it
 * both have one, it is the one drawn last, which is the one on top.
 */
export const pressLabel = async (root: ReactTestInstance, label: string) => {
  const node = buttonsLabelled(root, (candidate) => candidate === label).pop();
  if (!node) throw new Error(`No button labelled "${label}"`);
  await act(async () => {
    await node.props.onPress();
  });
  await flushPromises();
};

/** Presses a form row that opens something ("Make", "Purchased"). Its label reads "Make, Schumann". */
export const pressRow = async (root: ReactTestInstance, label: string) => {
  const [node] = buttonsLabelled(
    root,
    (candidate) => candidate === label || candidate.startsWith(`${label},`)
  );
  if (!node) throw new Error(`No row labelled "${label}"`);
  await act(async () => {
    await node.props.onPress();
  });
  await flushPromises();
};

/** The text field labelled `label`, such as a row of a form panel. */
export const inputLabelled = (root: ReactTestInstance, label: string) => {
  const [input] = root.findAll(
    (node) =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === "function"
  );
  if (!input) throw new Error(`No text field labelled "${label}"`);
  return input;
};

/** What the text field labelled `label` shows. */
export const inputValue = (root: ReactTestInstance, label: string): string =>
  inputLabelled(root, label).props.value;

/** Types `text` into the text field labelled `label`, replacing what is there. */
export const typeInto = (root: ReactTestInstance, label: string, text: string) => {
  const input = inputLabelled(root, label);
  act(() => {
    input.props.onChangeText(text);
  });
};

const MONTH_HEADING =
  /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/;

/**
 * Picks `date` in the row labelled `rowLabel`, like a user would: opens the
 * calendar, goes to the month, presses the day and Done. A calendar that was
 * closed stays in the tree in tests (its exit animation never finishes), so
 * this only looks at the one that is open.
 */
export const pickDate = async (
  root: ReactTestInstance,
  rowLabel: string,
  date: Date
) => {
  await pressRow(root, rowLabel);
  const [calendar] = root.findAll(
    (node) => node.type === DatePickerSheet && node.props.visible === true
  );
  if (!calendar) throw new Error(`"${rowLabel}" didn't open a calendar`);

  const shown = () => {
    const heading = allTexts(calendar).find((text) => MONTH_HEADING.test(text));
    if (!heading) throw new Error("The calendar is not showing a month");
    return parse(heading, "MMMM yyyy", new Date());
  };
  for (let guard = 0; guard < 240; guard++) {
    const months = differenceInCalendarMonths(date, shown());
    if (months === 0) break;
    await pressLabel(calendar, months > 0 ? "Next month" : "Previous month");
  }
  await pressLabel(calendar, format(date, "EEEE d MMMM yyyy"));
  await pressLabel(calendar, "Done");
};

/** Chooses a make in the Make picker. */
export const chooseMake = async (root: ReactTestInstance, make: string) => {
  await pressRow(root, "Make");
  const [picker] = root.findAll(
    (node) => node.type === MakePickerSheet && node.props.visible === true
  );
  if (!picker) throw new Error("Make didn't open the picker");
  await pressLabel(picker, make);
};

/** Chooses the company in its picker. */
export const chooseCompany = async (root: ReactTestInstance, company: string) => {
  await pressRow(root, "Company");
  const [picker] = root.findAll(
    (node) =>
      node.type === PickerSheet &&
      node.props.visible === true &&
      node.props.title === "Company"
  );
  if (!picker) throw new Error("Company didn't open the picker");
  await pressLabel(picker, company);
};

/** Chooses how the piano is used, in step 2 of the Add flow or on the Edit screen. */
export const chooseCategory = async (root: ReactTestInstance, category: string) => {
  await pressLabel(root, categoryLabelOf(category));
};

/** Adds a photo the way a user does: Add, then the camera or the gallery. */
export const addPhotoFrom = async (
  root: ReactTestInstance,
  source: "camera" | "library"
) => {
  await pressLabel(root, "Add a photo");
  await pressLabel(root, source === "camera" ? "Take a photo" : "Choose from gallery");
};

/**
 * Fills in step 1 of the Add flow (a photo from the gallery, the title, the
 * make, the company and the notes). The test mocks the image picker.
 */
export const fillBasics = async (
  root: ReactTestInstance,
  {
    title = "Kawai K-300",
    notes = "Black polish",
    make = "Other",
    company = "Shamshersons",
  }: { title?: string; notes?: string; make?: string; company?: string } = {}
) => {
  await addPhotoFrom(root, "library");
  typeInto(root, "Title", title);
  typeInto(root, "Notes", notes);
  await chooseMake(root, make);
  await chooseCompany(root, company);
};
