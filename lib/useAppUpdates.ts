import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";
import { showToast } from "@/utils/toast";

/** Coming back to the app checks again, but not more than once in this long. */
export const CHECK_EVERY_MS = 10 * 60 * 1000;

/**
 * Over-the-air updates: a fix published with `eas update` reaches the phone
 * without a new build. expo-updates already checks and downloads in the
 * background every time the app starts; this adds a check when the app comes
 * back to the front after a while, and tells the person when an update has
 * been downloaded, with a button to restart into it. If they ignore the
 * button, the update is used the next time the app starts.
 *
 * Does nothing where updates are off: while developing, in Expo Go, and in
 * a build made without them.
 */
const useAppUpdates = () => {
  const { isUpdatePending } = Updates.useUpdates();
  const told = useRef(false);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    let lastCheck = Date.now();
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state !== "active" || Date.now() - lastCheck < CHECK_EVERY_MS) return;
      lastCheck = Date.now();
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        // Once downloaded, useUpdates() reports it as pending
        if (isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // No connection, or the server is busy: try again the next time
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!Updates.isEnabled || !isUpdatePending || told.current) return;
    told.current = true;
    showToast("An update is ready", {
      duration: "long",
      action: {
        label: "Restart",
        onPress: () => {
          Updates.reloadAsync().catch(() => {});
        },
      },
    });
  }, [isUpdatePending]);
};

export default useAppUpdates;
