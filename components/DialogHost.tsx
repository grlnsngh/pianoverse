import React, { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui";
import { DialogRequest, setDialogListener } from "@/utils/dialog";

/**
 * Draws the dialogs asked for with showDialog(). One is on screen at a time; a
 * new one replaces it. Choosing a row closes the dialog, then does what the row
 * says.
 */
const DialogHost = () => {
  const [visible, setVisible] = useState(false);
  // Kept after it closes, so the words don't vanish while the dialog fades out
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const latest = useRef<DialogRequest | null>(null);

  useEffect(() => {
    setDialogListener((next) => {
      latest.current = next;
      setRequest(next);
      setVisible(true);
    });
    return () => setDialogListener(null);
  }, []);

  if (!request) return null;

  const close = () => setVisible(false);
  const actions = request.actions.map((action) => ({
    ...action,
    onPress: () => {
      close();
      action.onPress();
    },
  }));

  return (
    <Dialog
      visible={visible}
      title={request.title}
      message={request.message}
      actions={actions}
      // Without its own onDismiss the dialog takes the back button as its last
      // (safe) row, which closes it
      onDismiss={
        request.onDismiss
          ? () => {
              close();
              request.onDismiss?.();
            }
          : undefined
      }
    />
  );
};

export default DialogHost;
