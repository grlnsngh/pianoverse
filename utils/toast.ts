import { Platform, ToastAndroid } from "react-native";

export type ToastDuration = "short" | "long";

/** `success` shows a check, `error` an alert icon. Without one the toast is text only. */
export type ToastVariant = "success" | "error";

/** A button on the toast, such as Undo or Retry. It dismisses the toast when pressed. */
export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  duration?: ToastDuration;
  variant?: ToastVariant;
  action?: ToastAction;
}

/** What ToastHost needs beyond the message and how long to keep it up. */
export interface ToastDetails {
  variant?: ToastVariant;
  action?: ToastAction;
}

type ToastListener = (
  message: string,
  duration: ToastDuration,
  details: ToastDetails
) => void;

let listener: ToastListener | null = null;

/** Used by ToastHost, which draws the toast in the app. */
export const setToastListener = (nextListener: ToastListener | null) => {
  listener = nextListener;
};

/**
 * Shows a short message. `options` is a duration, or an object with the
 * duration, a `variant` and an `action`.
 *
 * On Android a plain message is still a native toast, which shows above sheets
 * and dialogs. A native toast can't hold a button, so a toast with an `action`
 * is always drawn by ToastHost. Elsewhere (iOS, web) ToastHost draws every toast.
 */
export const showToast = (
  message: string,
  options: ToastDuration | ToastOptions = "short"
) => {
  const { duration = "short", variant, action }: ToastOptions =
    typeof options === "string" ? { duration: options } : options;

  if (Platform.OS === "android" && !action) {
    ToastAndroid.show(
      message,
      duration === "long" ? ToastAndroid.LONG : ToastAndroid.SHORT
    );
  } else {
    listener?.(message, duration, { variant, action });
  }
};
