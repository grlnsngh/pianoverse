import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type PianoLoadStatus = "loading" | "ready" | "failed";

/** Reloads the pianos from the server. Resolves when the load has finished. */
export type PianoRefresher = () => Promise<unknown>;

export interface PianoData {
  /** Where the load of the pianos stands. It stays "ready" when there is no provider. */
  status: PianoLoadStatus;
  /** The Pianos tab says how its load is going */
  reportStatus: (status: PianoLoadStatus) => void;
  /**
   * The Pianos tab puts its reload here, so another tab (Today, when it is
   * pulled down) can ask for a fresh list. Empty until the Pianos tab exists.
   */
  refresher: React.MutableRefObject<PianoRefresher | null>;
}

const NO_REFRESHER: PianoData["refresher"] = { current: null };

export const PianoDataContext = createContext<PianoData>({
  status: "ready",
  reportStatus: () => {},
  refresher: NO_REFRESHER,
});

/**
 * The pianos are loaded by the Pianos tab's screen (`app/(tabs)/home.tsx`) into
 * redux, where every tab reads them. This carries what the other tabs need to
 * know about that load: whether it is still running, and how to run it again.
 */
export const PianoDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<PianoLoadStatus>("loading");
  const refresher = useRef<PianoRefresher | null>(null);
  const reportStatus = useCallback((next: PianoLoadStatus) => setStatus(next), []);
  const value = useMemo(
    () => ({ status, reportStatus, refresher }),
    [status, reportStatus]
  );

  return <PianoDataContext.Provider value={value}>{children}</PianoDataContext.Provider>;
};

export const usePianoData = () => useContext(PianoDataContext);
