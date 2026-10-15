import {
  clearLetterhead,
  loadLetterhead,
  loadLetterheadDesign,
  saveLetterhead,
  saveLetterheadDesign,
} from "@/lib/letterheadStorage";
import { clearLetterheadImages } from "@/lib/letterheadImages";
import {
  DEFAULT_DESIGN,
  EMPTY_LETTERHEAD,
  type Letterhead,
  type LetterheadDesign,
} from "@/utils/letterhead";

/**
 * The letterhead while the app is open: the business details and the design,
 * shared by the Letterhead screens and every paper form, so a change on one
 * screen is on the others at once. Read from the phone once, saved on every
 * change.
 */
export type LetterheadState = {
  details: Letterhead;
  design: LetterheadDesign;
  /** The saved letterhead has been read */
  ready: boolean;
};

const INITIAL: LetterheadState = { details: EMPTY_LETTERHEAD, design: DEFAULT_DESIGN, ready: false };

let state: LetterheadState = INITIAL;
let loading: Promise<void> | null = null;
// What was changed before the saved letterhead was read is kept, not overwritten by it
let changed = { details: false, design: false };
const listeners = new Set<() => void>();

const set = (next: LetterheadState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const getLetterheadState = (): LetterheadState => state;

export const subscribeLetterhead = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Reads the saved letterhead, once. */
export const loadLetterheadState = (): Promise<void> => {
  if (!loading) {
    loading = Promise.all([loadLetterhead(), loadLetterheadDesign()]).then(([details, design]) => {
      set({
        details: changed.details ? state.details : details,
        design: changed.design ? state.design : design,
        ready: true,
      });
    });
  }
  return loading;
};

/** Changes some of the business details, and saves them. */
export const updateLetterheadDetails = (patch: Partial<Letterhead>) => {
  changed.details = true;
  set({ ...state, details: { ...state.details, ...patch } });
  void saveLetterhead(state.details);
};

/** Changes some of the design, and saves it. */
export const updateLetterheadDesign = (patch: Partial<LetterheadDesign>) => {
  changed.design = true;
  set({ ...state, design: { ...state.design, ...patch } });
  void saveLetterheadDesign(state.design);
};

/** Forgets the letterhead on this phone, its images included: at sign out and on deleting the account. */
export const forgetLetterhead = async () => {
  await clearLetterhead();
  clearLetterheadImages();
  changed = { details: false, design: false };
  loading = null;
  set({ ...INITIAL, ready: false });
};

/** Starts again from nothing. For tests. */
export const resetLetterheadStoreForTests = () => {
  changed = { details: false, design: false };
  loading = null;
  state = INITIAL;
  listeners.clear();
};
