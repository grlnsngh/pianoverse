import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { format } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

/**
 * The current calendar day as "2026-09-29". It changes when the app comes back
 * to the front on a later day, so a screen that stays mounted overnight, such
 * as Today, can work out its day again instead of showing yesterday's.
 */
const useCurrentDay = () => {
  const [day, setDay] = useState(today);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setDay(today());
    });
    return () => subscription?.remove?.();
  }, []);

  return day;
};

export default useCurrentDay;
