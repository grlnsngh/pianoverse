import * as Haptics from "expo-haptics";

/**
 * Small taps you feel, not hear: a light one when something was saved, a
 * firmer one when something that can't be undone is confirmed. Nothing is felt
 * for a failure. They are for the hand, not the eye, so the Reduce Motion
 * setting doesn't turn them off; a phone with no vibration motor, or a
 * haptics setting that is off, just ignores them.
 */
const tap = (style: Haptics.ImpactFeedbackStyle) => {
  try {
    Promise.resolve(Haptics.impactAsync(style)).catch(() => {});
  } catch {
    // No haptics here (for example on the web); nothing to do
  }
};

/** Something was saved: a light tap. */
export const savedTap = () => tap(Haptics.ImpactFeedbackStyle.Light);

/** Something that can't be undone was confirmed (delete, discard, sign out): a firmer tap. */
export const confirmTap = () => tap(Haptics.ImpactFeedbackStyle.Medium);
