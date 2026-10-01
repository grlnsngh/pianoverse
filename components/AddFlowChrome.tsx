import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, spacing, type } from "@/constants/theme";
import { makeStyles } from "@/lib/ThemeContext";

/** The steps of the Add flow, one per segment of the progress bar. */
export const ADD_STEPS = 3;

type AddFlowTopBarProps = {
  /** Leaves the flow. It asks first when something has been entered. */
  onCancel: () => void;
  /** "New piano" for the Add flow, "Edit piano" on the Edit screen */
  title?: string;
};

/** The row at the top of every step: Cancel at the left, "New piano" in the middle. */
export const AddFlowTopBar = ({ onCancel, title = "New piano" }: AddFlowTopBarProps) => {
  const styles = useStyles();
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        style={styles.cancel}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
      <Text style={styles.topTitle} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
};

type AddFlowHeadingProps = {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
};

/**
 * Where the person is in the flow: three segments of which the first `step`
 * are filled, "Step 2 of 3", then what this step is for.
 */
export const AddFlowHeading = ({ step, title, subtitle }: AddFlowHeadingProps) => {
  const styles = useStyles();
  return (
    <View style={styles.heading}>
      {/* The words under the segments say the same, so screen readers skip them */}
      <View
        style={styles.segments}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length: ADD_STEPS }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, index < step && styles.segmentDone]}
          />
        ))}
      </View>
      <Text style={styles.stepText}>{`Step ${step} of ${ADD_STEPS}`}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

/** The bar of buttons at the bottom of a step, above the home indicator. */
export const AddFlowFooter = ({ children }: { children: React.ReactNode }) => {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        // 28 on an iPhone with a home indicator, 16 elsewhere
        { paddingBottom: Math.max(insets.bottom - 6, spacing.lg) },
      ]}
    >
      {children}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  topBar: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: {
    position: "absolute",
    left: 8,
    top: 4,
    height: spacing.minTarget,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  cancelText: { ...type.bodyMedium, color: colors.ink },
  topTitle: { ...type.sheetTitle, color: colors.ink },
  heading: { paddingHorizontal: spacing.screen },
  segments: { flexDirection: "row", gap: 4 },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.controlBorder,
  },
  segmentDone: { backgroundColor: colors.ink },
  stepText: {
    marginTop: 10,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink2,
  },
  title: {
    marginTop: spacing.md,
    ...type.pianoTitle,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 2,
    ...type.secondary,
    color: colors.ink2,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.screen,
    backgroundColor: colors.grouped,
  },
}));
