const mockContext = { setUser: jest.fn(), setIsLogged: jest.fn() };

jest.mock("@/lib/appwrite", () => ({
  signIn: jest.fn(() => Promise.resolve({})),
  getCurrentUser: jest.fn(() => Promise.resolve({ $id: "user-doc-1" })),
  createUser: jest.fn(() => Promise.resolve({ $id: "user-doc-1" })),
}));
jest.mock("@/lib/googleSignIn", () => ({
  signInWithGoogle: jest.fn(),
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
}));

import React from "react";
import { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import { router } from "expo-router";
import SignIn from "@/app/(auth)/sign-in";
import GoogleButton from "@/components/GoogleButton";
import SignUp from "@/app/(auth)/sign-up";
import { createUser, getCurrentUser, signIn } from "@/lib/appwrite";
import { signInWithGoogle } from "@/lib/googleSignIn";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import {
  allTexts,
  captureToasts,
  createTestStore,
  flushPromises,
  inputLabelled,
  pressLabel,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/** "Continue with Google" on the Sign in and Create account screens. */

const google = jest.mocked(signInWithGoogle);
const user = { $id: "user-doc-9", username: "Gurleen Singh" };

beforeEach(() => {
  jest.clearAllMocks();
  google.mockReset().mockResolvedValue({ status: "signed_in", user });
  // Back to what they answer in every other test, whatever an earlier test left queued
  jest.mocked(signIn).mockReset().mockResolvedValue({});
  jest.mocked(getCurrentUser).mockReset().mockResolvedValue({ $id: "user-doc-1" } as any);
  jest.mocked(createUser).mockReset().mockResolvedValue({ $id: "user-doc-1" });
});
afterEach(() => {
  jest.restoreAllMocks();
});

const render = (screen: React.ReactElement) => renderWithStore(screen, createTestStore());

/** Presses a button without waiting for what it starts to finish, for one that is meant to stay busy. */
const startPress = async (root: ReactTestInstance, label: string) => {
  const node = root
    .findAll((candidate) => candidate.props.accessibilityLabel === label && typeof candidate.props.onPress === "function")
    .pop();
  if (!node) throw new Error(`No button labelled "${label}"`);
  await act(async () => {
    void node.props.onPress();
  });
};

/** A Google sign-in that hasn't finished, so what shows while it goes on can be seen. */
const pendingGoogle = () => {
  let finish: (result: any) => void = () => {};
  let fail: (error: Error) => void = () => {};
  google.mockImplementationOnce(
    () =>
      new Promise((resolve, reject) => {
        finish = resolve;
        fail = reject;
      })
  );
  return {
    finish: (result: any) => finish(result),
    fail: (error: Error) => fail(error),
  };
};

describe.each([
  ["Sign in", SignIn, "/sign-in"],
  ["Create account", SignUp, "/sign-up"],
] as const)("%s with Google", (_name, Screen, path) => {
  it("has a Continue with Google button after the form, with an or between", () => {
    const renderer = render(<Screen />);

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Continue with Google");
    expect(texts).toContain("or");
    expect(texts.indexOf("or")).toBeLessThan(texts.indexOf("Continue with Google"));
  });

  it("opens Google from this screen when pressed", async () => {
    const renderer = render(<Screen />);

    await pressLabel(renderer.root, "Continue with Google");

    expect(google).toHaveBeenCalledWith(path);
  });

  it("signs the person in, welcomes them and opens the app", async () => {
    const toasts = captureToasts();
    const renderer = render(<Screen />);

    await pressLabel(renderer.root, "Continue with Google");

    expect(mockContext.setUser).toHaveBeenCalledWith(user);
    expect(mockContext.setIsLogged).toHaveBeenCalledWith(true);
    expect(toasts).toEqual(["Welcome! Signed in with Google"]);
    expect(router.replace).toHaveBeenCalledWith("/home");
  });

  it("does nothing when the person closes Google's page", async () => {
    google.mockResolvedValue({ status: "cancelled" });
    const toasts = captureToasts();
    const renderer = render(<Screen />);

    await pressLabel(renderer.root, "Continue with Google");

    expect(mockContext.setUser).not.toHaveBeenCalled();
    expect(mockContext.setIsLogged).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(toasts).toEqual([]);
    expect(allTexts(renderer.root)).toContain("Continue with Google");
    expect(
      renderer.root.findAll((node) => node.props.accessibilityRole === "alert")
    ).toHaveLength(0);
  });

  it("says why in the red box when it fails, and stays on the screen", async () => {
    google.mockRejectedValue(new Error("OAuth provider is disabled"));
    const renderer = render(<Screen />);

    await pressLabel(renderer.root, "Continue with Google");

    expect(allTexts(renderer.root)).toContain("Google sign-in isn’t switched on for Pianoverse yet.");
    expect(router.replace).not.toHaveBeenCalled();
    expect(mockContext.setIsLogged).not.toHaveBeenCalled();
    // The button is there to try again
    expect(allTexts(renderer.root)).toContain("Continue with Google");
  });

  it("takes the red box away when the person tries again, or types", async () => {
    google.mockRejectedValueOnce(new Error("access_denied"));
    const renderer = render(<Screen />);
    await pressLabel(renderer.root, "Continue with Google");
    expect(allTexts(renderer.root)).toContain("Google sign-in didn’t go through. Please try again.");

    await pressLabel(renderer.root, "Continue with Google");
    expect(allTexts(renderer.root)).not.toContain("Google sign-in didn’t go through. Please try again.");

    google.mockRejectedValueOnce(new Error("access_denied"));
    await pressLabel(renderer.root, "Continue with Google");
    expect(allTexts(renderer.root)).toContain("Google sign-in didn’t go through. Please try again.");
    typeInto(renderer.root, "Email", "g");
    expect(allTexts(renderer.root)).not.toContain("Google sign-in didn’t go through. Please try again.");
  });

  it("while Google is open: says so, greys the rest out and ignores another press", async () => {
    const pending = pendingGoogle();
    const renderer = render(<Screen />);

    await startPress(renderer.root, "Continue with Google");

    expect(allTexts(renderer.root)).toContain("Opening Google");
    expect(allTexts(renderer.root)).not.toContain("Continue with Google");
    expect(inputLabelled(renderer.root, "Email").props.editable).toBe(false);
    expect(inputLabelled(renderer.root, "Password").props.editable).toBe(false);
    const button = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Opening Google" && "accessibilityState" in node.props
    )[0];
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    const back = renderer.root.findAll((node) => node.props.accessibilityLabel === "Back")[0];
    expect(back.props.disabled).toBe(true);

    await act(async () => {
      pending.finish({ status: "cancelled" });
    });
    await flushPromises();

    expect(google).toHaveBeenCalledTimes(1);
    expect(inputLabelled(renderer.root, "Email").props.editable).toBe(true);
    expect(allTexts(renderer.root)).toContain("Continue with Google");
  });

  it("is not pressed twice by a quick double press", async () => {
    const pending = pendingGoogle();
    const renderer = render(<Screen />);
    const button = () =>
      renderer.root.findAll(
        (node) =>
          typeof node.props.onPress === "function" &&
          (node.props.accessibilityLabel === "Continue with Google" ||
            node.props.accessibilityLabel === "Opening Google")
      )[0];

    // Both presses arrive before the screen has drawn the busy state
    await act(async () => {
      const press = button().props.onPress;
      press();
      press();
    });
    expect(google).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.finish({ status: "cancelled" });
    });
  });

  it("is greyed out, and can't be pressed, while the email form is being sent", async () => {
    let release: () => void = () => {};
    const pending = () => new Promise<any>((resolve) => (release = () => resolve({})));
    jest.mocked(path === "/sign-in" ? signIn : createUser).mockImplementationOnce(pending);
    const renderer = render(<Screen />);

    if (path === "/sign-up") typeInto(renderer.root, "Username", "owner");
    typeInto(renderer.root, "Email", "owner@example.com");
    typeInto(renderer.root, "Password", "password1");
    await startPress(renderer.root, path === "/sign-in" ? "Sign in" : "Create account");

    const button = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Continue with Google" && "accessibilityState" in node.props
    )[0];
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(button.props.disabled).toBe(true);

    await act(async () => {
      release();
    });
    await flushPromises();
  });

  it("has a name, a role and a big enough target, like every other button", () => {
    const renderer = render(<Screen />);

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
    const button = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Continue with Google" && node.props.accessibilityRole === "button"
    )[0];
    expect(button).toBeDefined();
  });
});

describe("the Google button on its own", () => {
  const pressableOf = (renderer: ReactTestRenderer) =>
    renderer.root.findAll((node) => node.props.accessibilityRole === "button")[0];

  it("presses when it is free", () => {
    const onPress = jest.fn();
    const renderer = render(<GoogleButton onPress={onPress} />);

    pressableOf(renderer).props.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(allTexts(renderer.root)).toEqual(["Continue with Google"]);
  });

  it("does nothing when pressed while Google is open, and says so", () => {
    const onPress = jest.fn();
    const renderer = render(<GoogleButton onPress={onPress} loading />);

    expect(pressableOf(renderer).props.onPress).toBeUndefined();
    expect(pressableOf(renderer).props.disabled).toBe(true);
    expect(pressableOf(renderer).props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(allTexts(renderer.root)).toEqual(["Opening Google"]);
  });

  it("does nothing when something else is going on, and is not marked busy", () => {
    const onPress = jest.fn();
    const renderer = render(<GoogleButton onPress={onPress} disabled />);

    expect(pressableOf(renderer).props.onPress).toBeUndefined();
    expect(pressableOf(renderer).props.accessibilityState).toMatchObject({ busy: false, disabled: true });
    expect(allTexts(renderer.root)).toEqual(["Continue with Google"]);
  });
});

describe("the email forms are as they were", () => {
  it("still sign in with an email and password", async () => {
    const renderer = render(<SignIn />);

    typeInto(renderer.root, "Email", "owner@example.com");
    typeInto(renderer.root, "Password", "password1");
    await pressLabel(renderer.root, "Sign in");

    expect(signIn).toHaveBeenCalledWith("owner@example.com", "password1");
    expect(google).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/home");
  });
});
