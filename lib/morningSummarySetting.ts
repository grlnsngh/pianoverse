import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Whether the person wants the 9:00 morning summary (Account). It is on until
 * they turn it off, and is kept on this phone only: what is remembered is the
 * choice to have none, so a read that fails never silences it.
 */

const KEY = "morningSummary:off";

export interface MorningSummarySetting {
  /** False until the choice has been read from the phone */
  loaded: boolean;
  enabled: boolean;
}

let state: MorningSummarySetting = { loaded: false, enabled: true };
let reading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const set = (next: MorningSummarySetting) => {
  state = next;
  listeners.forEach((listener) => listener());
};

/** Reads the choice, once. */
export const loadMorningSummarySetting = (): Promise<void> => {
  if (state.loaded) return Promise.resolve();
  if (!reading) {
    reading = (async () => {
      try {
        const off = (await AsyncStorage.getItem(KEY)) === "1";
        set({ loaded: true, enabled: !off });
      } catch (error) {
        console.warn("Could not read the morning summary setting:", error);
        set({ loaded: true, enabled: true });
      }
    })();
  }
  return reading;
};

/** Turns the summary on or off, and remembers it. Resolves to whether it was remembered. */
export const setMorningSummaryEnabled = async (enabled: boolean): Promise<boolean> => {
  set({ loaded: true, enabled });
  try {
    if (enabled) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, "1");
    return true;
  } catch (error) {
    console.warn("Could not save the morning summary setting:", error);
    return false;
  }
};

/** Starts again from nothing. For tests. */
export const resetMorningSummarySettingForTests = () => {
  state = { loaded: false, enabled: true };
  reading = null;
  listeners.clear();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => state;

/** The choice, read the first time a screen asks and the same on every screen. */
export const useMorningSummarySetting = (): MorningSummarySetting => {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    void loadMorningSummarySetting();
  }, []);
  return current;
};
