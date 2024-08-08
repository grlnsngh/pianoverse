import { PianoItem } from "./types";
import { SET_PIANO_LIST_ITEMS } from "./actions";

// Define the state interface
export interface PianoState {
  items: PianoItem[];
}

// Define the initial state
const initialState: PianoState = {
  items: [],
};

// Create the reducer
const pianoReducer = (
  state = initialState,
  action: { type: string; payload: PianoItem[] }
): PianoState => {
  switch (action.type) {
    case SET_PIANO_LIST_ITEMS:
      return {
        ...state,
        items: action.payload,
      };
    default:
      return state;
  }
};

export default pianoReducer;
