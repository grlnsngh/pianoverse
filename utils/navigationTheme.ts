import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";
import type { Palette, Scheme } from "@/constants/theme";

/**
 * The look of the navigation's own surfaces, such as the background behind a
 * screen that is sliding in, in each theme. Light is the library's own, as it
 * has always been; dark takes the app's colours.
 */
export const navigationThemeFor = (scheme: Scheme, colors: Palette): Theme =>
  scheme === "dark"
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.brand,
          background: colors.page,
          card: colors.page,
          text: colors.ink,
          border: colors.hairline,
          notification: colors.late,
        },
      }
    : DefaultTheme;
