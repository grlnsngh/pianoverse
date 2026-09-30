import {
  NavigationActionTypes,
  RESET_CREATE_FORM,
  SET_ACTIVE_TAB,
  TabKey,
} from "./actions";

/**
 * The tab the app opens on. Pianos until the Today tab is built (Batch 6 of
 * docs/redesign/PLAN.md), then Today.
 */
export const INITIAL_TAB: TabKey = "pianos";

export interface NavigationState {
  activeTab: TabKey;
  // Changes whenever the Create form should start over
  createFormResetCount: number;
}

const initialState: NavigationState = {
  activeTab: INITIAL_TAB,
  createFormResetCount: 0,
};

const navigationReducer = (
  state = initialState,
  action: NavigationActionTypes
): NavigationState => {
  switch (action.type) {
    case SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload };
    case RESET_CREATE_FORM:
      return { ...state, createFormResetCount: state.createFormResetCount + 1 };
    default:
      return state;
  }
};

export default navigationReducer;
