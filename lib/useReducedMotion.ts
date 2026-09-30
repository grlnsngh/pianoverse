import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// What the phone last said. A screen that opens later starts from this, so a
// person who wants less motion doesn't see a slide in its first frames.
let known = false;

/** For tests: forget what the phone said, so one test's setting doesn't leak into the next. */
export const resetReducedMotion = () => {
  known = false;
};

/**
 * Whether the person has asked their phone for less motion (SPEC section 7).
 * Loops such as spinners, the keys loader and the skeleton shimmer stop, and
 * slides become short fades. It follows the setting while the app is open.
 * The first screen starts as false and corrects itself a moment after the
 * first render; every screen after it starts from what the phone said.
 *
 * Asking the phone can't crash a screen: if the setting can't be read, motion
 * stays on.
 */
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(known);

  useEffect(() => {
    let mounted = true;
    Promise.resolve()
      .then(() => AccessibilityInfo.isReduceMotionEnabled())
      .then((enabled) => {
        known = !!enabled;
        if (mounted) setReduced(known);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        known = !!enabled;
        setReduced(known);
      }
    );
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return reduced;
};

export default useReducedMotion;
