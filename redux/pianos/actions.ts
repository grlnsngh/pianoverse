import {
  FiltersType,
  PianoItem,
  SET_FILTERED_PIANO_LIST_ITEMS,
  SET_PIANO_FILTERS,
  SET_PIANO_LIST_ITEMS,
  SET_BULK_SELECTION_MODE,
  SET_SELECTED_ITEMS,
  CLEAR_SELECTED_ITEMS,
  TOGGLE_ITEM_SELECTION,
  SELECT_ALL_ITEMS,
  SetFilteredPianoListItemsAction,
  SetPianoFiltersAction,
  SetPianoListItemsAction,
  SetBulkSelectionModeAction,
  SetSelectedItemsAction,
  ClearSelectedItemsAction,
  ToggleItemSelectionAction,
  SelectAllItemsAction,
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

export const setBulkSelectionMode = (
  isEnabled: boolean
): SetBulkSelectionModeAction => ({
  type: SET_BULK_SELECTION_MODE,
  payload: isEnabled,
});

export const setSelectedItems = (
  itemIds: string[]
): SetSelectedItemsAction => ({
  type: SET_SELECTED_ITEMS,
  payload: itemIds,
});

export const clearSelectedItems = (): ClearSelectedItemsAction => ({
  type: CLEAR_SELECTED_ITEMS,
});

export const toggleItemSelection = (
  itemId: string
): ToggleItemSelectionAction => ({
  type: TOGGLE_ITEM_SELECTION,
  payload: itemId,
});

export const selectAllItems = (
  itemIds: string[]
): SelectAllItemsAction => ({
  type: SELECT_ALL_ITEMS,
  payload: itemIds,
});
