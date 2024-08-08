import { createStore, applyMiddleware, combineReducers } from "redux";
import createSagaMiddleware from "redux-saga";
import logger from "redux-logger";

import userReducer, { UserState } from "./users/reducers";
import pianoReducer, { PianoState } from "./pianos/reducer";

const rootReducer = combineReducers({
  users: userReducer,
  pianos: pianoReducer,
});

export type RootState = ReturnType<typeof rootReducer> & {
  user: UserState;
  piano: PianoState;
};

const sagaMiddleware = createSagaMiddleware();

const store = createStore(rootReducer, applyMiddleware(sagaMiddleware, logger));

export default store;
