/**
 * A stand-in for expo-router's `usePreventRemove` (the hook that replaced the
 * `beforeRemove` event in Expo SDK 58): it remembers what the screen asked it
 * to guard, and lets a test try to leave the screen the way a back button, a
 * Cancel or a swipe does.
 *
 *   jest.mock("expo-router", () => ({
 *     usePreventRemove: (...args: unknown[]) => require("./helpers/preventRemove").fakePreventRemove.hook(...args),
 *   }));
 */
type Blocked = { data: { action: { type: string } }; repeat: () => void };
type Callback = (blocked: Blocked) => void;

let last: { prevent: boolean; callback?: Callback } | null = null;
// The hook's returned function lifts the guard at once, before the screen draws again
let lifted = false;

const disablePrevention = jest.fn(() => {
  lifted = true;
});

export const fakePreventRemove = {
  disablePrevention,

  /** What the screen calls. */
  hook(prevent: boolean, callback?: Callback) {
    if (!last || last.prevent !== prevent) lifted = false;
    last = { prevent, callback };
    return disablePrevention;
  },

  /** Forgets everything, between tests. */
  reset() {
    last = null;
    lifted = false;
    disablePrevention.mockClear();
  },

  /** Whether the screen is guarding against being left now. */
  guarding() {
    return !!last && last.prevent && !lifted;
  },

  /**
   * Tries to leave, as a back button does. When the screen is guarding, its
   * callback runs with the blocked action and `repeat` (which carries on
   * leaving); otherwise the screen simply goes. Says which happened.
   */
  tryToLeave() {
    const action = { type: "GO_BACK" };
    const repeat = jest.fn();
    const blocked = this.guarding() && !!last?.callback;
    if (blocked) last!.callback!({ data: { action }, repeat });
    return { blocked, repeat, action };
  },
};
