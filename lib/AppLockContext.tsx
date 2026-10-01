import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, BackHandler, StyleSheet, View } from "react-native";
import LockScreen from "@/components/LockScreen";
import { authenticate, isLockAvailable } from "@/lib/biometrics";
import { loadAppLockEnabled, saveAppLockEnabled } from "@/lib/appLockStorage";
import {
  failureMessage,
  LOCK_OFF_MESSAGE,
  shouldLock,
  UnlockFailure,
} from "@/utils/appLock";
import { showToast } from "@/utils/toast";
import { makeStyles } from "@/lib/ThemeContext";

export type EnableResult = { ok: true } | { ok: false; reason: UnlockFailure };

export type AppLock = {
  /** Whether the person has turned the lock on */
  enabled: boolean;
  /** Whether the app is locked right now */
  locked: boolean;
  /** What the lock screen says after a try that didn't open it */
  message: string;
  /** Asks the phone to check the person, and opens the app if it does */
  unlock: () => Promise<void>;
  /** Turns the lock on, after the phone has checked the person once */
  enable: () => Promise<EnableResult>;
  disable: () => Promise<void>;
};

const NOT_AVAILABLE: AppLock = {
  enabled: false,
  locked: false,
  message: "",
  unlock: async () => {},
  enable: async () => ({ ok: false, reason: "unavailable" }),
  disable: async () => {},
};

const AppLockContext = createContext<AppLock>(NOT_AVAILABLE);

export const useAppLock = () => useContext(AppLockContext);

/**
 * The app lock: when it is on, the app asks the phone for a fingerprint, face
 * or screen lock when it starts, and again when it comes back after being out
 * of sight for a minute. It is kept on this phone only. If the phone no longer
 * has anything to check with (the screen lock was removed), the lock turns
 * itself off instead of shutting the person out.
 */
export const AppLockProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const styles = useStyles();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const leftAt = useRef<number | null>(null);

  const switchOff = useCallback(async () => {
    await saveAppLockEnabled(false);
    setEnabled(false);
    setLocked(false);
    setMessage("");
  }, []);

  // At start: locked when the lock is on, unless the phone can no longer check
  useEffect(() => {
    let current = true;
    (async () => {
      const on = await loadAppLockEnabled();
      if (on && !(await isLockAvailable())) {
        await saveAppLockEnabled(false);
        showToast(LOCK_OFF_MESSAGE, { duration: "long" });
        if (current) setReady(true);
        return;
      }
      if (!current) return;
      setEnabled(on);
      setLocked(on);
      setReady(true);
    })();
    return () => {
      current = false;
    };
  }, []);

  // Locks again when the app was out of sight for the whole minute
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        leftAt.current = Date.now();
      } else if (state === "active") {
        if (shouldLock(leftAt.current, Date.now())) setLocked(true);
        leftAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  // The back button leaves the app; it must not go on to the screens under the lock
  useEffect(() => {
    if (!locked) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        BackHandler.exitApp();
        return true;
      }
    );
    return () => subscription.remove();
  }, [locked]);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await authenticate("Unlock Pianoverse");
      if (result.ok) {
        setLocked(false);
        setMessage("");
      } else if (result.reason === "unavailable") {
        await switchOff();
        showToast(LOCK_OFF_MESSAGE, { duration: "long" });
      } else {
        setMessage(failureMessage(result.reason));
      }
    } finally {
      busy.current = false;
    }
  }, [switchOff]);

  const enable = useCallback(async (): Promise<EnableResult> => {
    if (!(await isLockAvailable())) return { ok: false, reason: "unavailable" };
    const result = await authenticate("Turn on app lock");
    if (!result.ok) return { ok: false, reason: result.reason };
    if (!(await saveAppLockEnabled(true)))
      return { ok: false, reason: "failed" };
    setEnabled(true);
    return { ok: true };
  }, []);

  const value = useMemo<AppLock>(
    () => ({ enabled, locked, message, unlock, enable, disable: switchOff }),
    [enabled, locked, message, unlock, enable, switchOff]
  );

  return (
    <AppLockContext.Provider value={value}>
      {/* While the setting is still being read, the screens stay covered, so a locked app never flashes its pianos */}
      <View style={styles.fill}>
        <View
          style={styles.fill}
          importantForAccessibility={
            locked || !ready ? "no-hide-descendants" : "auto"
          }
          accessibilityElementsHidden={locked || !ready}
        >
          {children}
        </View>
        {!ready && <View style={styles.cover} />}
        {locked && <LockScreen message={message} onUnlock={unlock} />}
      </View>
    </AppLockContext.Provider>
  );
};

const useStyles = makeStyles((colors) => ({
  fill: { flex: 1 },
  cover: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.page },
}));
