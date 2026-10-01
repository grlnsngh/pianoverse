jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

import React from "react";
import { AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";
import Dialog from "@/components/ui/Dialog";
import SignOutSheet from "@/components/SignOutSheet";
import { confirmTap, savedTap } from "@/utils/haptics";
import { showToast } from "@/utils/toast";
import { allTexts, pressText, renderWithStore, createTestStore } from "./helpers/render";

const impact = Haptics.impactAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the taps", () => {
  it("are a light one for a save and a firmer one for a confirmation", () => {
    savedTap();
    confirmTap();

    expect(impact.mock.calls).toEqual([["light"], ["medium"]]);
  });

  it("never fail the screen that asked for them", () => {
    impact.mockImplementationOnce(() => {
      throw new Error("No haptics on this device");
    });
    impact.mockImplementationOnce(() => Promise.reject(new Error("Not allowed")));

    expect(() => savedTap()).not.toThrow();
    expect(() => confirmTap()).not.toThrow();
  });

  it("are still felt with Reduce Motion on, since they are not movement", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);

    savedTap();

    expect(impact).toHaveBeenCalledWith("light");
  });
});

describe("when a save works", () => {
  it("is felt when the toast is the saved one, with its check", () => {
    showToast("Payment recorded", { variant: "success" });

    expect(impact).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledWith("light");
  });

  it("is felt for a saved toast with an Undo button too", () => {
    showToast("Marked as sold", { variant: "success", action: { label: "Undo", onPress: jest.fn() } });

    expect(impact).toHaveBeenCalledWith("light");
  });

  it("is not felt when it fails, or for a plain message", () => {
    showToast("Couldn’t save. Check your connection.", { variant: "error" });
    showToast("Password reset email sent!", "long");
    showToast("Hello");

    expect(impact).not.toHaveBeenCalled();
  });
});

describe("when something that can't be undone is confirmed", () => {
  const actions = (onDelete: () => void, onKeep: () => void) => [
    { label: "Delete", tone: "destructive" as const, onPress: onDelete },
    { label: "Cancel", emphasis: true, onPress: onKeep },
  ];

  it("is felt on the red choice of a dialog, which still does what it says", async () => {
    const onDelete = jest.fn();
    const renderer = renderWithStore(
      <Dialog visible title="Delete Kawai K-300?" actions={actions(onDelete, jest.fn())} />,
      createTestStore()
    );

    await pressText(renderer.root, "Delete");

    expect(impact).toHaveBeenCalledWith("medium");
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("is not felt on the safe choice", async () => {
    const onKeep = jest.fn();
    const renderer = renderWithStore(
      <Dialog visible title="Delete Kawai K-300?" actions={actions(jest.fn(), onKeep)} />,
      createTestStore()
    );

    await pressText(renderer.root, "Cancel");

    expect(impact).not.toHaveBeenCalled();
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it("is felt on the red Sign out button", async () => {
    const onConfirm = jest.fn();
    const renderer = renderWithStore(
      <SignOutSheet visible signingOut={false} onConfirm={onConfirm} onClose={jest.fn()} />,
      createTestStore()
    );
    expect(allTexts(renderer.root)).toContain("Sign out of Pianoverse?");

    await pressText(renderer.root, "Sign out");

    expect(impact).toHaveBeenCalledWith("medium");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
