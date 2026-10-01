import React from "react";
import { Alert, Modal } from "react-native";
import { act } from "react-test-renderer";
import { setDialogListener, showDialog } from "@/utils/dialog";
import { createTestStore, dialogOf, pressDialog, renderWithStore } from "./helpers/render";

// renderWithStore draws the DialogHost, like the app's root layout
const mountHost = () => renderWithStore(<></>, createTestStore());

const ask = (overrides: Partial<Parameters<typeof showDialog>[0]> = {}) => {
  const remove = jest.fn();
  const cancel = jest.fn();
  act(() => {
    showDialog({
      title: "Delete Yamaha U1?",
      message: "This removes the piano, its photos and its payments. This can’t be undone.",
      // Given safe first on purpose: the dialog must still draw the red one on top
      actions: [
        { label: "Cancel", onPress: cancel },
        { label: "Delete", tone: "destructive", onPress: remove },
      ],
      ...overrides,
    });
  });
  return { remove, cancel };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("showDialog and the DialogHost", () => {
  it("shows nothing until something is asked", () => {
    const renderer = mountHost();

    expect(dialogOf(renderer.root)).toBeNull();
  });

  it("shows the title and the message, with the choice that destroys something first", () => {
    const renderer = mountHost();
    ask();

    expect(dialogOf(renderer.root)).toEqual({
      title: "Delete Yamaha U1?",
      message: "This removes the piano, its photos and its payments. This can’t be undone.",
      actions: ["Delete", "Cancel"],
    });
  });

  it("does what a choice says, once, and closes", async () => {
    const renderer = mountHost();
    const { remove, cancel } = ask();

    await pressDialog(renderer.root, "Delete");

    expect(remove).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(Modal).every((modal) => !modal.props.visible)).toBe(true);
  });

  it("closes on the safe choice without touching anything else", async () => {
    const renderer = mountHost();
    const { remove, cancel } = ask();

    await pressDialog(renderer.root, "Cancel");

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(dialogOf(renderer.root)).toBeNull();
  });

  it("takes Android's back button as the last choice, the safe one", () => {
    const renderer = mountHost();
    const { remove, cancel } = ask();

    const [modal] = renderer.root.findAllByType(Modal).filter((node) => node.props.visible);
    act(() => modal.props.onRequestClose());

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(dialogOf(renderer.root)).toBeNull();
  });

  it("takes the back button as onDismiss when the question gives one", () => {
    const renderer = mountHost();
    const onDismiss = jest.fn();
    const { remove, cancel } = ask({ onDismiss });

    const [modal] = renderer.root.findAllByType(Modal).filter((node) => node.props.visible);
    act(() => modal.props.onRequestClose());

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(dialogOf(renderer.root)).toBeNull();
  });

  it("puts a new question in place of an old one", () => {
    const renderer = mountHost();
    ask();

    ask({ title: "Undo this sale?", message: "It goes back into stock.", actions: [{ label: "Undo sale", tone: "destructive", onPress: jest.fn() }, { label: "Cancel", onPress: jest.fn() }] });

    expect(dialogOf(renderer.root)).toEqual({
      title: "Undo this sale?",
      message: "It goes back into stock.",
      actions: ["Undo sale", "Cancel"],
    });
  });

  it("can ask again after a dialog has been answered", async () => {
    const renderer = mountHost();
    const first = ask();
    await pressDialog(renderer.root, "Cancel");
    expect(first.cancel).toHaveBeenCalledTimes(1);

    const second = ask();
    await pressDialog(renderer.root, "Delete");

    expect(second.remove).toHaveBeenCalledTimes(1);
  });

  it("falls back to a system alert when no host is on screen, so a question is never lost", () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    setDialogListener(null);
    const remove = jest.fn();

    showDialog({
      title: "Delete Yamaha U1?",
      message: "This can’t be undone.",
      actions: [
        { label: "Delete", tone: "destructive", onPress: remove },
        { label: "Cancel", onPress: jest.fn() },
      ],
    });

    expect(alert).toHaveBeenCalledWith("Delete Yamaha U1?", "This can’t be undone.", [
      { text: "Delete", style: "destructive", onPress: remove },
      { text: "Cancel", style: "default", onPress: expect.any(Function) },
    ]);
  });
});
