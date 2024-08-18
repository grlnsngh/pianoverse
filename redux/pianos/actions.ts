import {
  FiltersType,
  PianoItem,
  SET_FILTERED_PIANO_LIST_ITEMS,
  SET_PIANO_FILTERS,
  SET_PIANO_LIST_ITEMS,
  SetFilteredPianoListItemsAction,
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

export const setFilteredPianoListItems = (
  items: PianoItem[]
): SetFilteredPianoListItemsAction => ({
  type: SET_FILTERED_PIANO_LIST_ITEMS,
  payload: items,
});
