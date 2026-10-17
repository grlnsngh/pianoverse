import { useSyncExternalStore } from "react";

// A piano's address that opened the app from outside (a label scanned with
// the phone's own camera, `pianoverse://detail/<id>`). Someone who isn't signed
// in has no pianos to show, so the address is kept here and the app goes to its
// first screen; the Pianos tab opens the piano once it has loaded the pianos,
// which only happens for a signed-in person (app/+native-intent.tsx).

let pending: string | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

/** Keeps a piano to open once the app has its pianos. */
export const setPendingPianoLink = (pianoId: string) => {
  pending = pianoId;
  emit();
};

/** The piano waiting to be opened, if any, and forgets it. */
export const takePendingPianoLink = (): string | null => {
  const taken = pending;
  if (taken !== null) {
    pending = null;
    emit();
  }
  return taken;
};

/** Forgets what is waiting: at sign out, so the next person never opens it. For tests too. */
export const clearPendingPianoLink = () => {
  if (pending !== null) {
    pending = null;
    emit();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const snapshot = () => pending;

/** The piano waiting to be opened, as it changes. */
export const usePendingPianoLink = () => useSyncExternalStore(subscribe, snapshot, snapshot);
