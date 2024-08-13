import {
  FiltersType,
  PianoItem,
  SET_PIANO_FILTERS,
  SET_PIANO_LIST_ITEMS,
  SetPianoFiltersAction,
  SetPianoListItemsAction,
} from "./types";

// Create the action creator
export const setPianoListItems = (
  items: PianoItem[]
): SetPianoListItemsAction => ({
  type: SET_PIANO_LIST_ITEMS,
  payload: items,
});

export const setPianoFilters = (
  filters: FiltersType
): SetPianoFiltersAction => ({
  type: SET_PIANO_FILTERS,
  payload: filters,
});
