import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { LayoutChangeEvent } from "react-native";

/**
 * How tall the bar pinned to the bottom of the screen really is (the tab bar,
 * or the sticky action bar on a piano's page). Both grow with the phone's Font
 * size, so a toast can't sit a fixed 50 px above the home indicator: it would
 * end up over the bar. A bar calls `useReportBottomBar` and hands the result
 * to its `onLayout`; `ToastHost` reads `useBottomBarHeight`. When two bars
 * are on screen at once (a piano's page is pushed over the tabs) the one
 * that appeared last is the one in front.
 */

type Bar = { id: number; height: number };

let bars: Bar[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const setHeight = (id: number, height: number) => {
  const known = bars.find((bar) => bar.id === id);
  if (known) {
    if (known.height === height) return;
    bars = bars.map((bar) => (bar.id === id ? { id, height } : bar));
  } else {
    bars = [...bars, { id, height }];
  }
  emit();
};

const remove = (id: number) => {
  if (!bars.some((bar) => bar.id === id)) return;
  bars = bars.filter((bar) => bar.id !== id);
  emit();
};

/** For tests: forget every bar, so one test's bar doesn't leak into the next. */
export const resetBottomBars = () => {
  bars = [];
  emit();
};

/**
 * For a bar at the bottom of the screen: the `onLayout` to put on it. It says
 * the bar's height as soon as it is measured, and forgets the bar when it goes.
 */
export const useReportBottomBar = () => {
  const id = useRef(0);
  useEffect(
    () => () => {
      if (id.current) remove(id.current);
    },
    []
  );
  return useCallback((event: LayoutChangeEvent) => {
    if (!id.current) id.current = nextId++;
    setHeight(id.current, Math.round(event.nativeEvent.layout.height));
  }, []);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const current = () => (bars.length ? bars[bars.length - 1].height : null);

/** The height of the bar in front, or null when none has been measured. */
export const useBottomBarHeight = () => useSyncExternalStore(subscribe, current, current);
