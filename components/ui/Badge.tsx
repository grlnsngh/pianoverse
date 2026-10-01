import React from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { radii, type } from "@/constants/theme";
import type { StatusTone } from "@/utils/rentalStatus";
import { makeStyles, useColors } from "@/lib/ThemeContext";

/**
 * `late` is a red pill for an overdue rental. `soon` is a white pill with an
 * orange dot for a rental about to end. Same words as the status line. A
 * `normal` rental gets no badge.
 */
export type BadgeTone = Exclude<StatusTone, "normal">;

/** Distance from the top and left edge of a photo */
const PHOTO_INSET = 8;
const DOT_SIZE = 7;

export type BadgeProps = {
  tone: BadgeTone;
  label: string;
  /** Pin it to the top left corner of the photo it sits on. Default false. */
  onPhoto?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const Badge = ({ tone, label, onPhoto = false, style, testID }: BadgeProps) => {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View
      accessible
      accessibilityLabel={label}
      testID={testID}
      style={[
        styles.pill,
        { backgroundColor: tone === "late" ? colors.lateFill : colors.surface },
        onPhoto && styles.onPhoto,
        style,
      ]}
    >
      {tone === "soon" && <View style={styles.dot} />}
      <Text
        style={[
          type.badge,
          { color: tone === "late" ? colors.white : colors.ink },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 9,
    borderRadius: radii.full,
  },
  onPhoto: { position: "absolute", top: PHOTO_INSET, left: PHOTO_INSET },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.brand,
  },
}));

export default React.memo(Badge);
