/** The steps of the Add flow that come before the review. */
export type AddStep = 1 | 2;

type StepListener = (step: AddStep) => void;

let listener: StepListener | null = null;

/** Used by the Add screen, which owns the current step. Returns what stops listening. */
export const setAddStepListener = (nextListener: StepListener | null) => {
  listener = nextListener;
  return () => {
    if (listener === nextListener) listener = null;
  };
};

/**
 * Sends the Add screen back to a step, for the Edit links on the review, which
 * is a screen of its own above it. The caller goes back to the Add screen after.
 */
export const goToAddStep = (step: AddStep) => listener?.(step);
