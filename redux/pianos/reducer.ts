import {
  FiltersType,
  PianoActionTypes,
  PianoItem,
  SET_FILTERED_PIANO_LIST_ITEMS,
  SET_PIANO_FILTERS,
  SET_PIANO_LIST_ITEMS,
  SET_BULK_SELECTION_MODE,
  SET_SELECTED_ITEMS,
  CLEAR_SELECTED_ITEMS,
  TOGGLE_ITEM_SELECTION,
  SELECT_ALL_ITEMS,
} from "./types";
import { DEFAULT_FILTERS } from "@/app/constants/Piano";

// Define the state interface
export interface PianoState {
  items: PianoItem[];
  filters: FiltersType;
  filteredItems: PianoItem[];
  isBulkSelectionMode: boolean;
  selectedItems: string[]; // Array of item IDs
}

// Define the initial state
const initialState: PianoState = {
  items: [],
  filters: DEFAULT_FILTERS,
  filteredItems: [],
  isBulkSelectionMode: false,
  selectedItems: [],
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
    case SET_BULK_SELECTION_MODE:
      return {
        ...state,
        isBulkSelectionMode: action.payload,
        selectedItems: action.payload ? state.selectedItems : [],
      };
    case SET_SELECTED_ITEMS:
      return {
        ...state,
        selectedItems: action.payload,
      };
    case CLEAR_SELECTED_ITEMS:
      return {
        ...state,
        selectedItems: [],
      };
    case TOGGLE_ITEM_SELECTION:
      const isSelected = state.selectedItems.includes(action.payload);
      return {
        ...state,
        selectedItems: isSelected
          ? state.selectedItems.filter(id => id !== action.payload)
          : [...state.selectedItems, action.payload],
      };
    case SELECT_ALL_ITEMS:
      return {
        ...state,
        selectedItems: action.payload,
      };
    default:
      return state;
  }
};

export default pianoReducer;
