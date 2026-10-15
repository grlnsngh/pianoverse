import { useEffect } from "react";
import { AppState } from "react-native";
import { sendFormEvents } from "@/lib/formEvents";

/**
 * Sends the paper forms' usage counts that are waiting on the phone when the
 * app starts and each time it comes back to the front, so one made without a
 * connection goes once there is one. Nothing is sent when nothing waits.
 */
const useSendFormEvents = () => {
  useEffect(() => {
    void sendFormEvents();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void sendFormEvents();
    });
    return () => subscription.remove();
  }, []);
};

export default useSendFormEvents;
