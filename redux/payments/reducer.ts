import { PAYMENTS_CHANGED, PaymentsActionTypes } from "./actions";

export interface PaymentsState {
  // Changes whenever a rent payment is added or deleted
  changeCount: number;
}

const initialState: PaymentsState = { changeCount: 0 };

const paymentsReducer = (
  state = initialState,
  action: PaymentsActionTypes
): PaymentsState => {
  switch (action.type) {
    case PAYMENTS_CHANGED:
      return { ...state, changeCount: state.changeCount + 1 };
    default:
      return state;
  }
};

export default paymentsReducer;
