import fs from "fs";
import path from "path";

const loadStore = (isDev: boolean) => {
  let store: any;
  const globals = global as any;
  const wasDev = globals.__DEV__;
  globals.__DEV__ = isDev;
  jest.isolateModules(() => {
    store = require("@/redux/store").default;
  });
  globals.__DEV__ = wasDev;
  return store;
};

const consoleCalls = () =>
  (["log", "group", "groupCollapsed", "groupEnd", "info"] as const).map((method) =>
    jest.spyOn(console, method).mockImplementation(() => {})
  );

afterEach(() => {
  jest.restoreAllMocks();
});

it("does not log every action in production builds", () => {
  const store = loadStore(false);
  const spies = consoleCalls();

  store.dispatch({ type: "SET_ACTIVE_TAB", payload: "account" });

  expect(store.getState().navigation.activeTab).toBe("account");
  spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
});

it("still logs actions while developing", () => {
  const store = loadStore(true);
  const spies = consoleCalls();

  store.dispatch({ type: "SET_ACTIVE_TAB", payload: "account" });

  expect(spies.some((spy) => spy.mock.calls.length > 0)).toBe(true);
});

it("doesn't ship the unused saga, toolkit and chart packages", () => {
  const { dependencies } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
  );

  expect(Object.keys(dependencies)).toEqual(
    expect.not.arrayContaining([
      "redux-saga",
      "@reduxjs/toolkit",
      "react-native-chart-kit",
    ])
  );
});
