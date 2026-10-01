import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Appearance as PhoneAppearance,
  StyleSheet,
  useColorScheme,
} from "react-native";
import {
  lightColors,
  Palette,
  palettes,
  Scheme,
} from "@/constants/theme";
import {
  AppearanceSetting,
  DEFAULT_APPEARANCE,
  resolveScheme,
} from "@/utils/appearance";
import { loadAppearance, saveAppearance } from "./appearanceStorage";

export type ThemeValue = {
  /** The theme being drawn: "light" or "dark" */
  scheme: Scheme;
  /** The colours of that theme. Draw with these, never with `lightColors` */
  colors: Palette;
  /** What the person picked, which may be to follow the phone */
  setting: AppearanceSetting;
  setSetting: (setting: AppearanceSetting) => void;
  /** False until the saved choice has been read, so the first frame isn't the wrong theme */
  ready: boolean;
};

/** Outside a provider, such as in a test that renders one component, the app is light. */
const LIGHT_THEME: ThemeValue = {
  scheme: "light",
  colors: lightColors,
  setting: DEFAULT_APPEARANCE,
  setSetting: () => {},
  ready: true,
};

export const ThemeContext = createContext<ThemeValue>(LIGHT_THEME);

/** The theme: its colours, which one it is, and how to change it. */
export const useTheme = () => useContext(ThemeContext);

/** The colours to draw with, for the theme the person is using. */
export const useColors = (): Palette => useContext(ThemeContext).colors;

/**
 * Owns the person's choice (Light, Dark or Match phone), which is kept on the
 * phone, and hands every screen the colours for it. A change shows at once:
 * everything that reads `useColors()` or a `makeStyles` hook draws again.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Null until the saved choice has been read
  const [stored, setStored] = useState<AppearanceSetting | null>(null);
  const phoneScheme = useColorScheme();
  const setting = stored ?? DEFAULT_APPEARANCE;

  useEffect(() => {
    let current = true;
    loadAppearance().then((saved) => {
      // A choice made while this was reading wins over the one it found
      if (current) setStored((now) => now ?? saved);
    });
    return () => {
      current = false;
    };
  }, []);

  // The app is fixed to light in app.json, which also hides the phone's own
  // setting from it. Following the phone asks Android to stop hiding it, and
  // the phone's scheme then arrives through useColorScheme.
  useEffect(() => {
    if (setting !== "system") return;
    try {
      PhoneAppearance.setColorScheme(null);
    } catch (error) {
      console.warn("Could not follow the phone's theme:", error);
    }
  }, [setting]);

  const setSetting = useCallback((next: AppearanceSetting) => {
    setStored(next);
    void saveAppearance(next);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const scheme = resolveScheme(setting, phoneScheme);
    return {
      scheme,
      colors: palettes[scheme],
      setting,
      setSetting,
      ready: stored !== null,
    };
  }, [setting, phoneScheme, setSetting, stored]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Styles that depend on the theme. Write them once with the palette they get,
 * and read them in a component with the hook this returns:
 *
 *   const useStyles = makeStyles((colors) => ({ row: { backgroundColor: colors.surface } }));
 *   const Row = () => { const styles = useStyles(); return <View style={styles.row} />; };
 *
 * The styles are built once for each theme and kept, so a component gets the
 * same object every time it draws.
 */
export const makeStyles = <
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(
  factory: (colors: Palette) => T
) => {
  const built = new Map<Palette, T>();
  return (): T => {
    const colors = useColors();
    let styles = built.get(colors);
    if (!styles) {
      styles = StyleSheet.create(factory(colors)) as T;
      built.set(colors, styles);
    }
    return styles;
  };
};
