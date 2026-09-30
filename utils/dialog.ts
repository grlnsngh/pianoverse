import { Alert } from "react-native";
import type { DialogAction } from "@/components/ui/Dialog";

/** What to ask: the words, and the two or three choices. See `Dialog` for the rules. */
export interface DialogRequest {
  title: string;
  message?: string;
  actions: readonly DialogAction[];
  /** Android's back button. Defaults to the last choice, which should be the safe one. */
  onDismiss?: () => void;
}

type DialogListener = (request: DialogRequest) => void;

let listener: DialogListener | null = null;

/** Used by DialogHost, which draws the dialog in the app. */
export const setDialogListener = (nextListener: DialogListener | null) => {
  listener = nextListener;
};

/**
 * Asks the person to confirm something that can't be undone, with the design's
 * dialog (a full-width row per choice, the one that destroys something red and
 * first). It can be called from anywhere, like showToast. If no DialogHost is
 * on screen it falls back to the system alert, so a question is never lost.
 */
export const showDialog = (request: DialogRequest) => {
  if (listener) {
    listener(request);
    return;
  }

  Alert.alert(
    request.title,
    request.message,
    request.actions.map((action) => ({
      text: action.label,
      style: action.tone === "destructive" ? "destructive" : "default",
      onPress: action.onPress,
    }))
  );
};
