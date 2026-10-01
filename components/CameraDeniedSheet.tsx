import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Button, Icon, Sheet } from "@/components/ui";
import { colors, fonts, spacing } from "@/constants/theme";

type CameraDeniedSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The other way to add a photo: the sheet closes and the gallery opens */
  onChooseFromGallery: () => void;
};

/**
 * Shown when the camera can't be used because access was refused (CameraDenied
 * board): says so, and offers the phone's settings or the gallery instead.
 */
const CameraDeniedSheet = ({
  visible,
  onClose,
  onChooseFromGallery,
}: CameraDeniedSheetProps) => (
  <Sheet
    visible={visible}
    onClose={onClose}
    tone="white"
    testID="camera-denied-sheet"
    footer={
      <View style={styles.buttons}>
        <Button
          title="Open Settings"
          onPress={() => {
            onClose();
            Linking.openSettings().catch(() => {});
          }}
        />
        <Button
          title="Choose from gallery"
          variant="secondary"
          onPress={onChooseFromGallery}
        />
      </View>
    }
  >
    <View style={styles.body}>
      <View style={styles.circle}>
        <Icon name="cameraOff" size={30} color={colors.ink} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        Camera access is off
      </Text>
      <Text style={styles.message}>
        Allow camera access in Settings to take photos of your pianos. You can
        also choose photos from your gallery.
      </Text>
    </View>
  </Sheet>
);

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fillInput,
  },
  title: {
    marginTop: spacing.xl,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    color: colors.ink,
    textAlign: "center",
  },
  message: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink2,
    textAlign: "center",
  },
  buttons: { gap: 10 },
});

export default CameraDeniedSheet;
