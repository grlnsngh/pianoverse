import {
  FiltersType,
  PianoActionTypes,
  PianoItem,
  SET_FILTERED_PIANO_LIST_ITEMS,
  SET_PIANO_FILTERS,
  SET_PIANO_LIST_ITEMS,
} from "./types";
import { DEFAULT_FILTERS } from "@/app/constants/Piano";

// Define the state interface
export interface PianoState {
  items: PianoItem[];
  filters: FiltersType;
  filteredItems: PianoItem[];
}

// Define the initial state
const initialState: PianoState = {
  items: [],
  filters: DEFAULT_FILTERS,
  filteredItems: [],
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
    case SET_FILTERED_PIANO_LIST_ITEMS:
      return {
        ...state,
        filteredItems: action.payload,
      };
    default:
      return state;
  }
};

export default pianoReducer;
