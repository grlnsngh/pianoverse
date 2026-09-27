import {
  applyMiddleware,
  combineReducers,
  createStore,
  Middleware,
} from "redux";
import logger from "redux-logger";

import userReducer, { UserState } from "./users/reducers";
import pianoReducer, { PianoState } from "./pianos/reducer";
import navigationReducer from "./navigation/reducer";

const rootReducer = combineReducers({
  users: userReducer,
  pianos: pianoReducer,
  navigation: navigationReducer,
});

export type RootState = ReturnType<typeof rootReducer> & {
  user: UserState;
  piano: PianoState;
};

// Logging every action with the whole state is only useful while developing
const middleware: Middleware[] = __DEV__ ? [logger] : [];

const store = createStore(rootReducer, applyMiddleware(...middleware));

export default store;
