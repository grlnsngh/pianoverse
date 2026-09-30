import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Whether the person has asked their phone for less motion (SPEC section 7).
 * Loops such as spinners, the keys loader and the skeleton shimmer stop, and
 * slides become short fades. It follows the setting while the app is open.
 * It starts as false and corrects itself a moment after the first render.
 *
 * Asking the phone can't crash a screen: if the setting can't be read, motion
 * stays on.
 */
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.resolve()
      .then(() => AccessibilityInfo.isReduceMotionEnabled())
      .then((enabled) => mounted && setReduced(!!enabled))
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => setReduced(!!enabled)
    );
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return reduced;
};

export default useReducedMotion;
