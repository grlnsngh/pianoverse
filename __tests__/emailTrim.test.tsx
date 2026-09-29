jest.mock("@/lib/appwrite", () => ({
  signIn: jest.fn(() => Promise.resolve({})),
  getCurrentUser: jest.fn(() => Promise.resolve({ $id: "user-doc-1" })),
  createUser: jest.fn(() => Promise.resolve({ $id: "user-doc-1" })),
  sendPasswordRecovery: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ setUser: jest.fn(), setIsLogged: jest.fn() }),
}));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    Link: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    useLocalSearchParams: jest.fn(() => ({})),
  };
});

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import SignIn from "@/app/(auth)/sign-in";
import SignUp from "@/app/(auth)/sign-up";
import ForgetPassword from "@/app/(auth)/forget-password";
import { createUser, sendPasswordRecovery, signIn } from "@/lib/appwrite";
import {
  captureAlerts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

// What a phone's keyboard suggestion often leaves behind
const TYPED_EMAIL = "  tester@example.com ";
const EMAIL = "tester@example.com";

const typeInto = (renderer: ReactTestRenderer, title: string, text: string) =>
  act(() => {
    renderer.root
      .findAll(
        (node) =>
          node.props.title === title &&
          typeof node.props.handleChangeText === "function"
      )[0]
      .props.handleChangeText(text);
  });

const pressButton = async (renderer: ReactTestRenderer, title: string) => {
  const [button] = renderer.root.findAll(
    (node) =>
      node.props.title === title && typeof node.props.handlePress === "function"
  );
  if (!button) throw new Error(`No "${title}" button`);
  await act(async () => {
    await button.props.handlePress();
  });
  await flushPromises();
};

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  alerts = captureAlerts();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("an email typed with spaces around it", () => {
  it("still signs in", async () => {
    const renderer = renderWithStore(<SignIn />, createTestStore());
    typeInto(renderer, "Email Address", TYPED_EMAIL);
    typeInto(renderer, "Password", "12345678");

    await pressButton(renderer, "Sign In");

    expect(signIn).toHaveBeenCalledWith(EMAIL, "12345678");
    expect(alerts.titles()).toEqual([]);
  });

  it("still signs up", async () => {
    const renderer = renderWithStore(<SignUp />, createTestStore());
    typeInto(renderer, "Username", "tester");
    typeInto(renderer, "Email Address", TYPED_EMAIL);
    typeInto(renderer, "Password", "12345678");

    await pressButton(renderer, "Create Account");

    expect(createUser).toHaveBeenCalledWith(EMAIL, "12345678", "tester");
  });

  it("still gets a password reset link", async () => {
    const renderer = renderWithStore(<ForgetPassword />, createTestStore());
    typeInto(renderer, "Email Address", TYPED_EMAIL);

    await pressButton(renderer, "Send Reset Link");

    expect(sendPasswordRecovery).toHaveBeenCalledWith(EMAIL);
  });
});
