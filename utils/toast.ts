import { Platform, ToastAndroid } from "react-native";

export type ToastDuration = "short" | "long";
type ToastListener = (message: string, duration: ToastDuration) => void;

let listener: ToastListener | null = null;

/** Used by ToastHost, which shows the message on iOS and web. */
export const setToastListener = (nextListener: ToastListener | null) => {
  listener = nextListener;
};

/**
 * Shows a short message: a native toast on Android, an in-app banner
 * elsewhere (ToastAndroid does nothing on iOS and web).
 */
export const showToast = (
  message: string,
  duration: ToastDuration = "short"
) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(
      message,
      duration === "long" ? ToastAndroid.LONG : ToastAndroid.SHORT
    );
  } else {
    listener?.(message, duration);
  }
};
