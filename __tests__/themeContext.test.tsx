let mockPhoneScheme: "light" | "dark" | null = "light";
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => mockPhoneScheme,
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Appearance, View } from "react-native";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { darkColors, lightColors } from "@/constants/theme";
import {
  makeStyles,
  ThemeProvider,
  ThemeValue,
  useColors,
  useTheme,
} from "@/lib/ThemeContext";

let theme!: ThemeValue;
const Probe = () => {
  theme = useTheme();
  return null;
};

const renderers: ReactTestRenderer[] = [];
const mount = async (ui: React.ReactElement) => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(ui);
  });
  renderers.push(renderer);
  return renderer;
};

const mountProvider = () =>
  mount(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );

const settle = () => act(async () => { await Promise.resolve(); });

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPhoneScheme = "light";
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  renderers.splice(0).forEach((renderer) => act(() => renderer.unmount()));
  jest.restoreAllMocks();
});

describe("the theme outside a provider", () => {
  it("is light, so a component drawn on its own (as most tests do) looks as it always has", async () => {
    await mount(<Probe />);

    expect(theme.scheme).toBe("light");
    expect(theme.colors).toBe(lightColors);
    expect(theme.setting).toBe("light");
    expect(theme.ready).toBe(true);
  });
});

describe("the theme provider", () => {
  it("is light, and ready, when nothing was saved", async () => {
    await mountProvider();

    expect(theme.scheme).toBe("light");
    expect(theme.colors).toBe(lightColors);
    expect(theme.ready).toBe(true);
  });

  it("isn't ready until the saved choice has been read, so the first frame isn't the wrong colour", async () => {
    let finish!: (value: string | null) => void;
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));

    await mountProvider();
    expect(theme.ready).toBe(false);

    await act(async () => finish("dark"));
    expect(theme.ready).toBe(true);
    expect(theme.scheme).toBe("dark");
  });

  it("draws dark when dark was saved", async () => {
    await AsyncStorage.setItem("appearance:setting", "dark");

    await mountProvider();

    expect(theme.setting).toBe("dark");
    expect(theme.scheme).toBe("dark");
    expect(theme.colors).toBe(darkColors);
  });

  it("changes at once when the person picks, and remembers it", async () => {
    await mountProvider();

    await act(async () => theme.setSetting("dark"));
    expect(theme.scheme).toBe("dark");
    expect(theme.colors).toBe(darkColors);
    expect(await AsyncStorage.getItem("appearance:setting")).toBe("dark");

    await act(async () => theme.setSetting("light"));
    expect(theme.scheme).toBe("light");
    expect(await AsyncStorage.getItem("appearance:setting")).toBeNull();
  });

  it("keeps a choice made while the saved one was still being read", async () => {
    let finish!: (value: string | null) => void;
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    await mountProvider();

    await act(async () => theme.setSetting("dark"));
    await act(async () => finish("light"));

    expect(theme.scheme).toBe("dark");
  });

  it("still changes for this visit when the choice can't be saved", async () => {
    await mountProvider();
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("full"));
    await act(async () => theme.setSetting("dark"));
    await settle();

    expect(theme.scheme).toBe("dark");
  });
});

describe("matching the phone", () => {
  it("follows what the phone says, and changes when the phone does", async () => {
    mockPhoneScheme = "dark";
    const renderer = await mountProvider();
    expect(theme.scheme).toBe("light");

    await act(async () => theme.setSetting("system"));
    expect(theme.scheme).toBe("dark");

    mockPhoneScheme = "light";
    await act(async () => {
      renderer.update(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      );
    });
    expect(theme.scheme).toBe("light");
  });

  it("is light when the phone says nothing", async () => {
    mockPhoneScheme = null;
    await mountProvider();

    await act(async () => theme.setSetting("system"));

    expect(theme.scheme).toBe("light");
  });

  it("asks Android to stop hiding its setting only when asked to match it (the app is fixed to light in app.json)", async () => {
    const setColorScheme = jest
      .spyOn(Appearance, "setColorScheme")
      .mockImplementation(() => {});
    await mountProvider();
    await act(async () => theme.setSetting("dark"));
    await act(async () => theme.setSetting("light"));
    expect(setColorScheme).not.toHaveBeenCalled();

    await act(async () => theme.setSetting("system"));

    expect(setColorScheme).toHaveBeenCalledTimes(1);
    expect(setColorScheme).toHaveBeenCalledWith(null);
  });

  it("carries on, and says why, when the phone won't let it ask", async () => {
    jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {
      throw new Error("not supported");
    });
    mockPhoneScheme = "dark";
    await mountProvider();

    await act(async () => theme.setSetting("system"));

    expect(theme.scheme).toBe("dark");
    expect(console.warn).toHaveBeenCalledWith(
      "Could not follow the phone's theme:",
      expect.any(Error)
    );
  });
});

describe("makeStyles", () => {
  const useStyles = makeStyles((colors) => ({
    box: { backgroundColor: colors.surface, borderColor: colors.hairline },
  }));

  let seen: ReturnType<typeof useStyles>[] = [];
  const Box = () => {
    seen.push(useStyles());
    return <View />;
  };
  const colorsSeen: string[] = [];
  const ColorsBox = () => {
    colorsSeen.push(useColors().ink);
    return null;
  };

  beforeEach(() => {
    seen = [];
    colorsSeen.length = 0;
  });

  it("builds the styles from the palette of the theme being drawn", async () => {
    await mount(<Box />);
    await AsyncStorage.setItem("appearance:setting", "dark");
    await mount(
      <ThemeProvider>
        <Box />
      </ThemeProvider>
    );

    expect(seen[0].box).toEqual({
      backgroundColor: lightColors.surface,
      borderColor: lightColors.hairline,
    });
    expect(seen[seen.length - 1].box).toEqual({
      backgroundColor: darkColors.surface,
      borderColor: darkColors.hairline,
    });
  });

  it("gives the same object every time for the same theme, so nothing is built twice", async () => {
    const renderer = await mount(<Box />);
    await act(async () => renderer.update(<Box />));

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.every((styles) => styles === seen[0])).toBe(true);
  });

  it("makes everything that reads the colours draw again when the theme changes", async () => {
    await mount(
      <ThemeProvider>
        <Probe />
        <ColorsBox />
      </ThemeProvider>
    );
    expect(colorsSeen[colorsSeen.length - 1]).toBe(lightColors.ink);

    await act(async () => theme.setSetting("dark"));

    expect(colorsSeen[colorsSeen.length - 1]).toBe(darkColors.ink);
  });
});
