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

export type ToastListener = (
  message: string,
  duration: ToastDuration,
  details: ToastDetails
) => void;

let listener: ToastListener | null = null;
const embeddedListeners = new Set<ToastListener>();

/** Used by the ToastHost in the root layout, which draws the toast in the app. */
export const setToastListener = (nextListener: ToastListener | null) => {
  listener = nextListener;
};

/**
 * Used by a ToastHost inside a sheet or a dialog. Those are modals, which draw
 * above the root host, so each carries a host of its own to show the toast
 * above the dim. Returns the function that stops listening.
 */
export const addToastListener = (nextListener: ToastListener) => {
  embeddedListeners.add(nextListener);
  return () => {
    embeddedListeners.delete(nextListener);
  };
};

/**
 * Shows a short message as the design's dark pill, on every platform.
 * `options` is a duration, or an object with the duration, a `variant` (a
 * check for something saved, an alert for something that failed) and an
 * `action` (Undo, Retry).
 */
export const showToast = (
  message: string,
  options: ToastDuration | ToastOptions = "short"
) => {
  const { duration = "short", variant, action }: ToastOptions =
    typeof options === "string" ? { duration: options } : options;

  listener?.(message, duration, { variant, action });
  embeddedListeners.forEach((embedded) =>
    embedded(message, duration, { variant, action })
  );
};
