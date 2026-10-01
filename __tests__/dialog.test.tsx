import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Dialog } from "@/components/ui";
import { lightColors as colors, fonts } from "@/constants/theme";
import { hostByTestId, mount, textContent } from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;
type Props = Partial<React.ComponentProps<typeof Dialog>>;

const flat = (style: unknown) => StyleSheet.flatten(style as any);

const deleteAction = (onPress = jest.fn()) => ({
  label: "Delete",
  onPress,
  tone: "destructive" as const,
});
const cancelAction = (onPress = jest.fn()) => ({ label: "Cancel", onPress });

const open = (props: Props = {}) =>
  mount(
    <Dialog
      visible
      testID="dialog"
      title="Delete Young Chang U-121?"
      message="This removes the piano, its photos and its payments. This can’t be undone."
      actions={[deleteAction(), cancelAction()]}
      {...props}
    />
  );

const rows = (renderer: Mounted) => renderer.root.findAllByType(Pressable);
const labels = (renderer: Mounted) => rows(renderer).map((row) => textContent(row));
const card = (renderer: Mounted) =>
  hostByTestId(renderer.root, "dialog").findAllByType(View)[0];

describe("Dialog look", () => {
  it("shows nothing until it is opened", async () => {
    const renderer = await open({ visible: false });

    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
    expect(renderer.root.findAllByType(Text)).toHaveLength(0);
    expect(renderer.root.findAllByType(Pressable)).toHaveLength(0);
  });

  it("is a transparent, fading modal", async () => {
    const renderer = await open();

    expect(renderer.root.findByType(Modal).props).toMatchObject({
      transparent: true,
      animationType: "fade",
    });
  });

  it("dims the screen and centres a card", async () => {
    const renderer = await open();

    expect(flat(hostByTestId(renderer.root, "dialog").props.style)).toMatchObject({
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.dim,
    });
  });

  it("is a white card 284 wide with radius 20 that clips its rows", async () => {
    const renderer = await open();

    expect(flat(card(renderer).props.style)).toMatchObject({
      width: 284,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: colors.white,
    });
  });

  it("has a centred 18 px bold title and a 14 px grey message", async () => {
    const renderer = await open();
    const [title, message] = renderer.root.findAllByType(Text);

    expect(textContent(title)).toBe("Delete Young Chang U-121?");
    expect(flat(title.props.style)).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 18,
      lineHeight: 24,
      textAlign: "center",
      color: colors.ink,
    });
    expect(title.props.accessibilityRole).toBe("header");
    expect(flat(message.props.style)).toMatchObject({
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      color: colors.ink2,
      marginTop: 6,
    });
  });

  it("leaves the message out when there is none", async () => {
    const renderer = await open({ message: undefined, actions: [cancelAction()] });

    expect(renderer.root.findAllByType(Text).map(textContent)).toEqual([
      "Delete Young Chang U-121?",
      "Cancel",
    ]);
  });

  it("is a modal for screen readers", async () => {
    const renderer = await open();

    expect(card(renderer).props.accessibilityViewIsModal).toBe(true);
  });
});

describe("Dialog choices", () => {
  it("has a full-width 52 px row for each, with a hairline above", async () => {
    const renderer = await open();

    for (const row of rows(renderer)) {
      expect(flat(row.props.style({ pressed: false }))).toMatchObject({
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
      });
    }
  });

  it("draws the destructive choice red and bold", async () => {
    const renderer = await open();
    const [destructive] = rows(renderer);

    expect(flat(destructive.findByType(Text).props.style)).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 16,
      color: colors.late,
    });
  });

  it("draws the safe choice in ink, medium", async () => {
    const renderer = await open();
    const safe = rows(renderer)[1];

    expect(flat(safe.findByType(Text).props.style)).toMatchObject({
      fontFamily: fonts.medium,
      color: colors.ink,
    });
  });

  it("can make a safe choice bolder, like Keep editing", async () => {
    const renderer = await open({
      actions: [deleteAction(), { label: "Keep editing", onPress: jest.fn(), emphasis: true }],
    });

    expect(flat(rows(renderer)[1].findByType(Text).props.style).fontFamily).toBe(fonts.semibold);
  });

  it("always puts the destructive choice on top and the safe one last", async () => {
    // Given in the wrong order on purpose
    const renderer = await open({ actions: [cancelAction(), deleteAction()] });

    expect(labels(renderer)).toEqual(["Delete", "Cancel"]);
  });

  it("keeps the order it is given otherwise, and puts several destructive ones first", async () => {
    const renderer = await open({
      actions: [
        { label: "Keep both", onPress: jest.fn() },
        deleteAction(),
        { label: "Remove all", onPress: jest.fn(), tone: "destructive" },
        { label: "Cancel", onPress: jest.fn() },
      ],
    });

    expect(labels(renderer)).toEqual(["Delete", "Remove all", "Keep both", "Cancel"]);
  });

  it("calls the choice that is pressed, and only that one", async () => {
    const onDelete = jest.fn();
    const onCancel = jest.fn();
    const renderer = await open({ actions: [deleteAction(onDelete), cancelAction(onCancel)] });

    rows(renderer)[0].props.onPress();

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("goes light grey while a choice is pressed", async () => {
    const renderer = await open();
    const style = rows(renderer)[0].props.style;

    expect(flat(style({ pressed: false })).backgroundColor).toBeUndefined();
    expect(flat(style({ pressed: true })).backgroundColor).toBe(colors.grouped);
  });

  it("makes each choice a button that reads its label", async () => {
    const renderer = await open();

    for (const row of rows(renderer)) {
      expect(row.props.accessibilityRole).toBe("button");
    }
    expect(rows(renderer).map((row) => row.props.accessibilityLabel)).toEqual(["Delete", "Cancel"]);
  });
});

describe("Dialog leaving", () => {
  it("treats the Android back button as the safe choice, the last row", async () => {
    const onDelete = jest.fn();
    const onCancel = jest.fn();
    const renderer = await open({ actions: [cancelAction(onCancel), deleteAction(onDelete)] });

    renderer.root.findByType(Modal).props.onRequestClose();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("can be told what back should do", async () => {
    const onDismiss = jest.fn();
    const onCancel = jest.fn();
    const renderer = await open({ onDismiss, actions: [deleteAction(), cancelAction(onCancel)] });

    renderer.root.findByType(Modal).props.onRequestClose();

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("doesn't close when the dim is tapped, like a system alert", async () => {
    const renderer = await open();
    const dim = hostByTestId(renderer.root, "dialog");

    expect(dim.props.onPress).toBeUndefined();
    expect(dim.props.onTouchEnd).toBeUndefined();
    // Only the choice rows can be pressed
    expect(rows(renderer)).toHaveLength(2);
  });

  it("survives having no choices, without a crash on back", async () => {
    const renderer = await open({ actions: [] });

    expect(() => renderer.root.findByType(Modal).props.onRequestClose()).not.toThrow();
  });
});
