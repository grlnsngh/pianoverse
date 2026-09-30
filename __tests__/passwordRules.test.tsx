jest.mock("@/lib/appwrite", () => ({
  createUser: jest.fn(() => Promise.resolve({ $id: "user-doc-1" })),
  updatePassword: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ setUser: jest.fn(), setIsLogged: jest.fn() }),
}));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    router: { push: jest.fn(), replace: jest.fn() },
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useLocalSearchParams: jest.fn(() => ({ userId: "user-1", secret: "secret-1" })),
  };
});

import fs from "fs";
import path from "path";
import React from "react";
import SignUp from "@/app/(auth)/sign-up";
import ResetPassword from "@/app/(auth)/reset-password";
import { createUser, updatePassword } from "@/lib/appwrite";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  pressButton,
  pressText,
  renderWithStore,
  typeInto,
} from "./helpers/render";

// Appwrite rejects passwords shorter than 8 characters
const TOO_SHORT = "1234567";
const LONG_ENOUGH = "12345678";

beforeEach(() => {
  jest.clearAllMocks();
  captureAlerts();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("sign up", () => {
  const fillIn = (password: string) => {
    const renderer = renderWithStore(<SignUp />, createTestStore());
    typeInto(renderer.root, "Username", "tester");
    typeInto(renderer.root, "Email", "tester@example.com");
    typeInto(renderer.root, "Password", password);
    return renderer;
  };

  it("rejects passwords shorter than 8 characters before calling Appwrite", async () => {
    const renderer = fillIn(TOO_SHORT);

    await pressButton(renderer.root, "Create account");

    expect(allTexts(renderer.root)).toContain("Password must be at least 8 characters.");
    expect(createUser).not.toHaveBeenCalled();
  });

  it("accepts an 8 character password", async () => {
    const renderer = fillIn(LONG_ENOUGH);

    await pressButton(renderer.root, "Create account");

    expect(createUser).toHaveBeenCalledWith("tester@example.com", LONG_ENOUGH, "tester");
  });
});

describe("reset password screen", () => {
  const fillIn = (password: string) => {
    // The screen also tries to read window.location, which native doesn't have
    jest.spyOn(console, "error").mockImplementation(() => {});
    const renderer = renderWithStore(<ResetPassword />, createTestStore());
    typeInto(renderer.root, "New password", password);
    typeInto(renderer.root, "Confirm new password", password);
    return renderer;
  };

  it("rejects passwords shorter than 8 characters", async () => {
    const renderer = fillIn(TOO_SHORT);

    await pressText(renderer.root, "Update password");

    expect(allTexts(renderer.root)).toContain("Password must be at least 8 characters.");
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it("accepts an 8 character password", async () => {
    const renderer = fillIn(LONG_ENOUGH);

    await pressText(renderer.root, "Update password");

    expect(updatePassword).toHaveBeenCalledWith("user-1", "secret-1", LONG_ENOUGH);
  });
});

it("the web reset page asks for at least 8 characters", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "reset-password.html"), "utf8");

  expect(html.match(/minlength="(\d+)"/g)).toEqual(['minlength="8"', 'minlength="8"']);
  expect(html).toContain("newPassword.length < 8");
});
