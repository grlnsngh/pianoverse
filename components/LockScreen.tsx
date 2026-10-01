import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark, Button } from "@/components/ui";
import { spacing, type } from "@/constants/theme";
import { makeStyles } from "@/lib/ThemeContext";

/**
 * What covers the app while it is locked: the mark, a line saying so, and an
 * Unlock button. The phone's own fingerprint, face or screen lock prompt opens
 * by itself as soon as this shows; the button asks again after a cancelled or
 * failed try. No board draws it; it follows the Published and Welcome screens.
 */
const LockScreen = ({
  message,
  onUnlock,
}: {
  /** What to say after a try that didn't open it */
  message: string;
  /** Asks the phone to check the person */
  onUnlock: () => void;
}) => {
  const styles = useStyles();
  useEffect(() => {
    onUnlock();
    // Asks once each time the lock comes up
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.page} testID="lock-screen">
      <View style={styles.center}>
        <BrandMark size={88} />
        <Text style={styles.title} accessibilityRole="header">
          Pianoverse is locked
        </Text>
        <Text style={styles.text}>
          Use your fingerprint, face or screen lock to open it.
        </Text>
        {!!message && (
          <Text
            style={styles.message}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {message}
          </Text>
        )}
      </View>
      <View style={styles.bottom}>
        <Button title="Unlock" onPress={onUnlock} />
      </View>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.page },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxxl,
  },
  title: {
    ...type.pianoTitle,
    marginTop: 28,
    textAlign: "center",
    color: colors.ink,
  },
  text: {
    ...type.body,
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.ink2,
  },
  message: {
    ...type.status,
    marginTop: spacing.lg,
    textAlign: "center",
    color: colors.late,
  },
  bottom: { paddingHorizontal: 24, paddingBottom: 28 },
}));

export default LockScreen;
