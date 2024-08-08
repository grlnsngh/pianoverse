import { PianoItem } from "./types";

// Define the action type
export const SET_PIANO_LIST_ITEMS = "SET_PIANO_LIST_ITEMS";

// Create the action creator
export const setPianoListItems = (items: PianoItem[]) => ({
  type: SET_PIANO_LIST_ITEMS,
  payload: items,
});
