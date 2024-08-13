import {
  FiltersType,
  PianoActionTypes,
  PianoItem,
  SET_PIANO_FILTERS,
  SET_PIANO_LIST_ITEMS,
} from "./types";
import { DEFAULT_FILTERS } from "@/app/constants/Piano";

// Define the state interface
export interface PianoState {
  items: PianoItem[];
  filters: FiltersType;
}

// Define the initial state
const initialState: PianoState = {
  items: [],
  filters: DEFAULT_FILTERS,
};

// Create the reducer
const pianoReducer = (
  state = initialState,
  action: PianoActionTypes
): PianoState => {
  switch (action.type) {
    case SET_PIANO_LIST_ITEMS:
      return {
        ...state,
        items: action.payload,
      };
    case SET_PIANO_FILTERS:
      return {
        ...state,
        filters: action.payload,
      };
    default:
      return state;
  }
};

export default pianoReducer;
