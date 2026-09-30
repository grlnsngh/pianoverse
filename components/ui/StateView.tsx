import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, fonts, spacing } from "@/constants/theme";
import Button from "./Button";
import Icon, { IconName } from "./Icon";
import PianoPhoto from "./PianoPhoto";

const ART_SIZE = 200;
const ICON_CIRCLE = 88;

export type StateViewProps = {
  title: string;
  message?: string;
  /** A round grey badge holding this icon, for a message such as "Couldn't load" */
  icon?: IconName;
  /**
   * The piano drawing on a large tile, for an empty list. Pass any id: it only
   * picks the colours.
   */
  art?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Filled orange (default) or the quieter grey */
  actionVariant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * What a list says when it has nothing to show: no pianos yet, nothing
 * matches, or it couldn't load. A picture, a title, one line of help and one
 * button that gets the person out of it.
 */
const StateView = ({
  title,
  message,
  icon,
  art,
  actionLabel,
  onAction,
  actionVariant = "primary",
  style,
  testID,
}: StateViewProps) => (
  <View
    testID={testID}
    style={[styles.container, { paddingTop: art ? 120 : 140 }, style]}
  >
    {art ? (
      <PianoPhoto id={art} style={styles.art} />
    ) : icon ? (
      <View style={styles.circle}>
        <Icon name={icon} size={40} color={colors.ink} strokeWidth={1.6} />
      </View>
    ) : null}

    <Text
      accessibilityRole="header"
      style={[styles.title, { marginTop: art ? 28 : icon ? 24 : 0 }]}
    >
      {title}
    </Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}

    {actionLabel && onAction ? (
      <Button
        title={actionLabel}
        onPress={onAction}
        variant={actionVariant}
        style={styles.button}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  art: { width: ART_SIZE, height: ART_SIZE, borderRadius: 48 },
  circle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fillInput,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.36,
    textAlign: "center",
    color: colors.ink,
  },
  message: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    color: colors.ink2,
  },
  button: { marginTop: 28, paddingHorizontal: 28 },
});

export default StateView;
