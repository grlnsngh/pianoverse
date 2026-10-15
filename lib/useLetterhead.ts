import { useEffect, useSyncExternalStore } from "react";
import {
  getLetterheadState,
  loadLetterheadState,
  subscribeLetterhead,
  updateLetterheadDesign,
  updateLetterheadDetails,
} from "@/lib/letterheadStore";

/**
 * The letterhead (business details and design) for a screen, read from the
 * phone the first time and the same on every screen; changes are saved at
 * once (lib/letterheadStore.ts).
 */
const useLetterhead = () => {
  const state = useSyncExternalStore(subscribeLetterhead, getLetterheadState, getLetterheadState);
  useEffect(() => {
    void loadLetterheadState();
  }, []);
  return {
    ...state,
    updateDetails: updateLetterheadDetails,
    updateDesign: updateLetterheadDesign,
  };
};

export default useLetterhead;
