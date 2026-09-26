export type TabKey = "home" | "create" | "profile";

export const SET_ACTIVE_TAB = "SET_ACTIVE_TAB";
export const RESET_CREATE_FORM = "RESET_CREATE_FORM";

export interface SetActiveTabAction {
  type: typeof SET_ACTIVE_TAB;
  payload: TabKey;
}

export interface ResetCreateFormAction {
  type: typeof RESET_CREATE_FORM;
}

export type NavigationActionTypes = SetActiveTabAction | ResetCreateFormAction;

/** Shows a tab without pushing another copy of the tabs screen. */
export const setActiveTab = (tab: TabKey): SetActiveTabAction => ({
  type: SET_ACTIVE_TAB,
  payload: tab,
});

/** Clears the Create form, e.g. after its piano was published. */
export const resetCreateForm = (): ResetCreateFormAction => ({
  type: RESET_CREATE_FORM,
});
