import { useEffect, useRef } from "react";
import { Platform, StatusBar } from "react-native";
import * as SystemUI from "expo-system-ui";
import type { Palette, Scheme } from "@/constants/theme";

/**
 * Keeps what is outside the app's own views in step with the theme: the
 * status bar's icons (light on dark, dark on light) and the colour of the
 * window behind everything, which shows when the keyboard opens or a screen
 * is pulled past its end.
 *
 * The app has always looked light, so in light this does nothing until the
 * person has been in dark and comes back.
 */
export default function useSystemChrome(scheme: Scheme, colors: Palette) {
  const changed = useRef(false);

  useEffect(() => {
    if (scheme === "light" && !changed.current) return;
    changed.current = true;

    StatusBar.setBarStyle(scheme === "dark" ? "light-content" : "dark-content", true);
    // Only Android has a coloured bar to set; on a translucent one it is not seen
    if (Platform.OS === "android") StatusBar.setBackgroundColor(colors.page, true);

    const setWindowColor = async () => {
      try {
        await SystemUI.setBackgroundColorAsync(colors.page);
      } catch (error) {
        console.warn("Could not set the window colour:", error);
      }
    };
    void setWindowColor();
  }, [scheme, colors]);
}
