import {
  applyMiddleware,
  combineReducers,
  createStore,
  Middleware,
  Reducer,
} from "redux";
import logger from "redux-logger";

import userReducer from "./users/reducers";
import pianoReducer, { PianoState } from "./pianos/reducer";
import navigationReducer, { NavigationState } from "./navigation/reducer";
import paymentsReducer, { PaymentsState } from "./payments/reducer";

// Each slice reducer only knows its own actions; at the root they all receive
// every action, which is what Redux's Reducer type describes
const rootReducer = combineReducers({
  users: userReducer,
  pianos: pianoReducer as Reducer<PianoState>,
  navigation: navigationReducer as Reducer<NavigationState>,
  payments: paymentsReducer as Reducer<PaymentsState>,
});

export type RootState = ReturnType<typeof rootReducer>;

// Logging every action with the whole state is only useful while developing
const middleware: Middleware[] = __DEV__ ? [logger] : [];

const store = createStore(rootReducer, applyMiddleware(...middleware));

export default store;
