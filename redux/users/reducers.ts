import { SET_CURRENT_USER } from "./actions";

export interface UserState {
  user: any | null;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
};

const userReducer = (state = initialState, action: any): UserState => {
  switch (action.type) {
    case SET_CURRENT_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };
    default:
      return state;
  }
};

export default userReducer;
