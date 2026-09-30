const mockContext = { setUser: jest.fn(), setIsLogged: jest.fn() };

jest.mock("@/lib/appwrite", () => ({
  signIn: jest.fn(() => Promise.resolve({})),
  getCurrentUser: jest.fn(() => Promise.resolve({ $id: "user-doc-1" })),
  createUser: jest.fn(() => Promise.resolve({ $id: "user-doc-1" })),
  sendPasswordRecovery: jest.fn(() => Promise.resolve({})),
  updatePassword: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => mockContext,
}));
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(() => ({ userId: "user-1", secret: "secret-1" })),
}));

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import { router, useLocalSearchParams } from "expo-router";
import ForgetPassword from "@/app/(auth)/forget-password";
import ResetPassword from "@/app/(auth)/reset-password";
import SignIn from "@/app/(auth)/sign-in";
import SignUp from "@/app/(auth)/sign-up";
import {
  createUser,
  getCurrentUser,
  sendPasswordRecovery,
  signIn,
  updatePassword,
} from "@/lib/appwrite";
import {
  allTexts,
  captureAlerts,
  captureToasts,
  createTestStore,
  flushPromises,
  inputLabelled,
  inputValue,
  pressButton,
  pressLabel,
  renderWithStore,
  typeInto,
} from "./helpers/render";

const context = mockContext;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(router.canGoBack).mockReturnValue(true);
  jest.mocked(useLocalSearchParams).mockReturnValue({ userId: "user-1", secret: "secret-1" });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const render = (screen: React.ReactElement) => renderWithStore(screen, createTestStore());

/** The field with this label leaves focus, as when the person moves on. */
const leave = (renderer: ReactTestRenderer, label: string) =>
  act(() => {
    inputLabelled(renderer.root, label).props.onBlur({});
  });

/** A sign-in that hasn't finished, so what shows while it goes on can be seen. */
const pendingSignIn = () => {
  let fail: (error: Error) => void = () => {};
  let succeed: () => void = () => {};
  jest.mocked(signIn).mockImplementationOnce(
    () =>
      new Promise((resolve, reject) => {
        succeed = () => resolve({});
        fail = reject;
      })
  );
  return { fail: (error: Error) => fail(error), succeed: () => succeed() };
};

describe("Sign in", () => {
  it("says what it is for", () => {
    const renderer = render(<SignIn />);

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Welcome back");
    expect(texts).toContain("Sign in to see your pianos and rentals.");
    expect(texts).toContain("Forgot password?");
    expect(texts).toContain("New to Pianoverse?");
    expect(allTexts(renderer.root).filter((text) => text === "Sign in")).toHaveLength(1);
  });

  it("shows a message under a field when it is left empty, not while it is being typed in", () => {
    const renderer = render(<SignIn />);
    expect(allTexts(renderer.root).join(" ")).not.toContain("Enter your");

    typeInto(renderer.root, "Email", "g");
    expect(allTexts(renderer.root)).not.toContain("Enter a valid email address.");

    leave(renderer, "Email");
    expect(allTexts(renderer.root)).toContain("Enter a valid email address.");

    // Typing again takes the message away until the field is left again
    typeInto(renderer.root, "Email", "grlnsngh@gmail.com");
    expect(allTexts(renderer.root)).not.toContain("Enter a valid email address.");
  });

  it("says what each field is missing when Sign in is pressed, and asks Appwrite for nothing", async () => {
    const renderer = render(<SignIn />);

    await pressButton(renderer.root, "Sign in");

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Enter your email address.");
    expect(texts).toContain("Enter your password.");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("signs in with the email trimmed, then goes to the app and says welcome", async () => {
    const toasts = captureToasts();
    const renderer = render(<SignIn />);
    typeInto(renderer.root, "Email", "  grlnsngh@gmail.com ");
    typeInto(renderer.root, "Password", "pianoverse1");

    await pressButton(renderer.root, "Sign in");

    expect(signIn).toHaveBeenCalledWith("grlnsngh@gmail.com", "pianoverse1");
    expect(getCurrentUser).toHaveBeenCalled();
    expect(context.setUser).toHaveBeenCalledWith({ $id: "user-doc-1" });
    expect(context.setIsLogged).toHaveBeenCalledWith(true);
    expect(router.replace).toHaveBeenCalledWith("/home");
    expect(toasts).toEqual(["Welcome back! Successfully logged in"]);
  });

  it("shows how far it is: greyed fields, Signing in on the button, no Forgot link, no back", async () => {
    const pending = pendingSignIn();
    const renderer = render(<SignIn />);
    typeInto(renderer.root, "Email", "grlnsngh@gmail.com");
    typeInto(renderer.root, "Password", "pianoverse1");

    await act(async () => {
      pressButton(renderer.root, "Sign in");
    });
    await flushPromises(2);

    expect(inputLabelled(renderer.root, "Email").props.editable).toBe(false);
    expect(inputLabelled(renderer.root, "Password").props.editable).toBe(false);
    expect(allTexts(renderer.root)).toContain("Signing in");
    expect(allTexts(renderer.root)).not.toContain("Forgot password?");
    const back = renderer.root.find(
      (node) => node.props.accessibilityLabel === "Back" && typeof node.props.onPress === "function"
    );
    expect(back.props.disabled).toBe(true);

    await act(async () => pending.succeed());
    await flushPromises();
    expect(router.replace).toHaveBeenCalledWith("/home");
  });

  it("puts a red box above the fields when the email or password is wrong, keeping what was typed", async () => {
    jest
      .mocked(signIn)
      .mockRejectedValueOnce(new Error("Invalid credentials. Please check the email and password."));
    const renderer = render(<SignIn />);
    typeInto(renderer.root, "Email", "grlnsngh@gmail.com");
    typeInto(renderer.root, "Password", "wrong-password");

    await pressButton(renderer.root, "Sign in");

    expect(allTexts(renderer.root)).toContain(
      "We couldn’t sign you in. Check your email and password and try again."
    );
    expect(inputValue(renderer.root, "Email")).toBe("grlnsngh@gmail.com");
    expect(inputValue(renderer.root, "Password")).toBe("wrong-password");
    expect(router.replace).not.toHaveBeenCalled();
    expect(inputLabelled(renderer.root, "Email").props.editable).toBe(true);

    // The box goes once something is changed
    typeInto(renderer.root, "Password", "right-password");
    expect(allTexts(renderer.root).join(" ")).not.toContain("We couldn’t sign you in");
  });

  it("uses no system alert for a failure", async () => {
    const alerts = captureAlerts();
    jest.mocked(signIn).mockRejectedValueOnce(new Error("Network request failed"));
    const renderer = render(<SignIn />);
    typeInto(renderer.root, "Email", "grlnsngh@gmail.com");
    typeInto(renderer.root, "Password", "pianoverse1");

    await pressButton(renderer.root, "Sign in");

    expect(alerts.titles()).toEqual([]);
    expect(allTexts(renderer.root)).toContain(
      "We couldn’t reach Pianoverse. Check your connection and try again."
    );
  });

  it("leads to Forgot password, to Create account, and back", async () => {
    const renderer = render(<SignIn />);

    await pressLabel(renderer.root, "Forgot password?");
    expect(router.push).toHaveBeenLastCalledWith("/forget-password");

    await pressLabel(renderer.root, "Create account");
    expect(router.push).toHaveBeenLastCalledWith("/sign-up");

    await pressLabel(renderer.root, "Back");
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("goes to the start screen from Back when it was opened without anything behind it", async () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);
    const renderer = render(<SignIn />);

    await pressLabel(renderer.root, "Back");

    expect(router.replace).toHaveBeenCalledWith("/");
    expect(router.back).not.toHaveBeenCalled();
  });

  it("hides the password until Show is pressed", async () => {
    const renderer = render(<SignIn />);
    expect(inputLabelled(renderer.root, "Password").props.secureTextEntry).toBe(true);

    await pressLabel(renderer.root, "Show password");

    expect(inputLabelled(renderer.root, "Password").props.secureTextEntry).toBe(false);
    expect(allTexts(renderer.root)).toContain("Hide");
  });
});

describe("Create account", () => {
  const fill = (renderer: ReactTestRenderer, password = "12345678") => {
    typeInto(renderer.root, "Username", "tester");
    typeInto(renderer.root, "Email", "tester@example.com");
    typeInto(renderer.root, "Password", password);
  };

  it("says what it is for", () => {
    const renderer = render(<SignUp />);

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Takes a minute. Add your first piano right after.");
    expect(texts).toContain("Already have an account?");
    expect(inputLabelled(renderer.root, "Username").props.placeholder).toBe("Choose a username");
    expect(inputLabelled(renderer.root, "Email").props.placeholder).toBe("you@example.com");
    expect(inputLabelled(renderer.root, "Password").props.placeholder).toBe("Create a password");
  });

  it("says what each field is missing when Create account is pressed", async () => {
    const renderer = render(<SignUp />);

    await pressButton(renderer.root, "Create account");

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Choose a username.");
    expect(texts).toContain("Enter your email address.");
    expect(texts).toContain("Create a password.");
    expect(createUser).not.toHaveBeenCalled();
  });

  it("shows a field's message when it is left", () => {
    const renderer = render(<SignUp />);
    typeInto(renderer.root, "Username", "ab");

    leave(renderer, "Username");

    expect(allTexts(renderer.root)).toContain("Username must be at least 3 characters.");
  });

  it("creates the account, goes to the app and says welcome", async () => {
    const toasts = captureToasts();
    const renderer = render(<SignUp />);
    fill(renderer);

    await pressButton(renderer.root, "Create account");

    expect(createUser).toHaveBeenCalledWith("tester@example.com", "12345678", "tester");
    expect(context.setIsLogged).toHaveBeenCalledWith(true);
    expect(router.replace).toHaveBeenCalledWith("/home");
    expect(toasts).toEqual(["Welcome! Account created successfully"]);
  });

  it("says an account with the email already exists", async () => {
    jest
      .mocked(createUser)
      .mockRejectedValueOnce(
        new Error("A user with the same id, email, or phone already exists in this project.")
      );
    const renderer = render(<SignUp />);
    fill(renderer);

    await pressButton(renderer.root, "Create account");

    expect(allTexts(renderer.root)).toContain(
      "An account with this email already exists. Try signing in instead."
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("leads to Sign in", async () => {
    const renderer = render(<SignUp />);

    await pressLabel(renderer.root, "Sign in");

    expect(router.push).toHaveBeenCalledWith("/sign-in");
  });
});

describe("Reset password (asking for the link)", () => {
  it("says what it is for, and that Back returns to sign in", () => {
    const renderer = render(<ForgetPassword />);

    expect(allTexts(renderer.root)).toContain(
      "Enter your email and we will send you a link to choose a new password."
    );
    expect(
      renderer.root.findAll((node) => node.props.accessibilityLabel === "Back to sign in").length
    ).toBeGreaterThan(0);
  });

  it("checks the email before asking Appwrite", async () => {
    const renderer = render(<ForgetPassword />);
    typeInto(renderer.root, "Email", "nope");

    await pressButton(renderer.root, "Send reset link");

    expect(allTexts(renderer.root)).toContain("Enter a valid email address.");
    expect(sendPasswordRecovery).not.toHaveBeenCalled();
  });

  it("sends the link, says to look in the inbox and goes back to Sign in", async () => {
    const toasts = captureToasts();
    const renderer = render(<ForgetPassword />);
    typeInto(renderer.root, "Email", "grlnsngh@gmail.com");

    await pressButton(renderer.root, "Send reset link");

    expect(sendPasswordRecovery).toHaveBeenCalledWith("grlnsngh@gmail.com");
    expect(toasts).toEqual(["Password reset email sent! Please check your inbox."]);
    expect(router.replace).toHaveBeenCalledWith("/sign-in");
  });

  it("puts a failure in the red box", async () => {
    jest.mocked(sendPasswordRecovery).mockRejectedValueOnce(new Error("Network request failed"));
    const renderer = render(<ForgetPassword />);
    typeInto(renderer.root, "Email", "grlnsngh@gmail.com");

    await pressButton(renderer.root, "Send reset link");

    expect(allTexts(renderer.root)).toContain(
      "We couldn’t reach Pianoverse. Check your connection and try again."
    );
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("Reset password (choosing the new one)", () => {
  const fill = (renderer: ReactTestRenderer, password: string, confirmation = password) => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    typeInto(renderer.root, "New password", password);
    typeInto(renderer.root, "Confirm new password", confirmation);
  };

  it("says when the two passwords differ", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const renderer = render(<ResetPassword />);
    fill(renderer, "12345678", "12345679");

    await pressButton(renderer.root, "Update password");

    expect(allTexts(renderer.root)).toContain("Passwords do not match.");
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it("sets the new password, says so and goes to Sign in", async () => {
    const toasts = captureToasts();
    jest.spyOn(console, "error").mockImplementation(() => {});
    const renderer = render(<ResetPassword />);
    fill(renderer, "12345678");

    await pressButton(renderer.root, "Update password");

    expect(updatePassword).toHaveBeenCalledWith("user-1", "secret-1", "12345678");
    expect(toasts).toEqual([
      "Password updated successfully! Please sign in with your new password.",
    ]);
    expect(router.replace).toHaveBeenCalledWith("/sign-in");
  });

  it("says when the link is missing its user and secret", async () => {
    const alerts = captureAlerts();
    jest.mocked(useLocalSearchParams).mockReturnValue({});
    const renderer = render(<ResetPassword />);
    fill(renderer, "12345678");

    await pressButton(renderer.root, "Update password");

    expect(alerts.titles()).toEqual(["Error"]);
    expect(alerts.spy.mock.calls[0][1]).toBe(
      "Invalid reset link. Please request a new password reset."
    );
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it("leaves to Sign in from the back button", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const renderer = render(<ResetPassword />);

    await pressLabel(renderer.root, "Back to sign in");

    expect(router.replace).toHaveBeenCalledWith("/sign-in");
  });
});
