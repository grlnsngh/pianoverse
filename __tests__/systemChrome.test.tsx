jest.mock("expo-system-ui", () => ({
  setBackgroundColorAsync: jest.fn(() => Promise.resolve(true)),
}));

import React from "react";
import { Platform, StatusBar } from "react-native";
import * as SystemUI from "expo-system-ui";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { darkColors, lightColors, Scheme } from "@/constants/theme";
import useSystemChrome from "@/lib/useSystemChrome";

const setBackgroundColorAsync = SystemUI.setBackgroundColorAsync as jest.Mock;

const Chrome = ({ scheme }: { scheme: Scheme }) => {
  useSystemChrome(scheme, scheme === "dark" ? darkColors : lightColors);
  return null;
};

let renderer: ReactTestRenderer | undefined;
const show = async (scheme: Scheme) => {
  await act(async () => {
    if (renderer) renderer.update(<Chrome scheme={scheme} />);
    else renderer = create(<Chrome scheme={scheme} />);
  });
};

let setBarStyle: jest.SpyInstance;
let setBackgroundColor: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  setBackgroundColorAsync.mockResolvedValue(true);
  setBarStyle = jest.spyOn(StatusBar, "setBarStyle").mockImplementation(() => {});
  setBackgroundColor = jest.spyOn(StatusBar, "setBackgroundColor").mockImplementation(() => {});
  jest.replaceProperty(Platform, "OS", "android");
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  jest.restoreAllMocks();
});

describe("the status bar and the window behind the app", () => {
  it("are left exactly as they have always been while the app is light", async () => {
    await show("light");

    expect(setBarStyle).not.toHaveBeenCalled();
    expect(setBackgroundColor).not.toHaveBeenCalled();
    expect(setBackgroundColorAsync).not.toHaveBeenCalled();
  });

  it("go dark with the app: light icons, a dark bar, and a dark window", async () => {
    await show("dark");

    expect(setBarStyle).toHaveBeenCalledWith("light-content", true);
    expect(setBackgroundColor).toHaveBeenCalledWith(darkColors.page, true);
    expect(setBackgroundColorAsync).toHaveBeenCalledWith(darkColors.page);
  });

  it("come back to light when the person switches back, rather than staying dark", async () => {
    await show("dark");
    jest.clearAllMocks();

    await show("light");

    expect(setBarStyle).toHaveBeenCalledWith("dark-content", true);
    expect(setBackgroundColor).toHaveBeenCalledWith(lightColors.page, true);
    expect(setBackgroundColorAsync).toHaveBeenCalledWith(lightColors.page);
  });

  it("only colour the bar on Android, where there is a coloured bar", async () => {
    jest.replaceProperty(Platform, "OS", "ios");

    await show("dark");

    expect(setBarStyle).toHaveBeenCalledWith("light-content", true);
    expect(setBackgroundColor).not.toHaveBeenCalled();
  });

  it("carry on, and say why, when the window colour can't be set", async () => {
    setBackgroundColorAsync.mockRejectedValueOnce(new Error("no window"));

    await show("dark");

    expect(setBarStyle).toHaveBeenCalledWith("light-content", true);
    expect(console.warn).toHaveBeenCalledWith(
      "Could not set the window colour:",
      expect.any(Error)
    );
  });
});
