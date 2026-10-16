import React from "react";
import { Text, View } from "react-native";
import { Button, Icon, Sheet } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import type { SavedPdf } from "@/lib/paperPdf";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { pagesText } from "@/utils/paperForms/catalog";

type PaperSavedSheetProps = {
  visible: boolean;
  /** The PDF just made. Kept after the sheet is closed, so it still shows while the sheet leaves. */
  pdf: SavedPdf | null;
  /** "Rent card", for "Rent card is ready" */
  title: string;
  /** "is" by default; "are" for "Labels are ready" */
  verb?: "is" | "are";
  onOpen: () => void;
  onPrint: () => void;
  onShare: () => void;
  onClose: () => void;
};

/**
 * Says the PDF is made and kept on the phone, and offers what to do with it
 * (PaperSaved board): open it, print it on a Wi-Fi printer, or share it.
 */
const PaperSavedSheet = ({ visible, pdf, title, verb = "is", onOpen, onPrint, onShare, onClose }: PaperSavedSheetProps) => {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Sheet visible={visible && !!pdf} onClose={onClose} tone="white" testID="paper-saved-sheet">
      <View style={styles.head}>
        <View style={styles.check}>
          <Icon name="check" size={28} color={colors.onBrand} strokeWidth={2.6} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title} {verb} ready
        </Text>
      </View>

      <View style={styles.file} accessible accessibilityLabel={pdf ? `${pdf.fileName}, ${pagesText(pdf.pages)}, A4, on this phone` : undefined}>
        <Icon name="document" size={28} color={colors.ink} strokeWidth={1.6} />
        <View style={styles.fileText}>
          <Text style={styles.fileName} numberOfLines={1}>
            {pdf?.fileName}
          </Text>
          <Text style={styles.fileMeta}>{pdf ? `${pagesText(pdf.pages)} · A4 · on this phone` : ""}</Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <Button title="Open" onPress={onOpen} />
        <View style={styles.row}>
          <Button title="Print" variant="secondary" size="compact" onPress={onPrint} style={styles.half} />
          <Button title="Share" variant="secondary" size="compact" onPress={onShare} style={styles.half} />
        </View>
      </View>

      <Text style={styles.hint}>
        Print sends it to a Wi-Fi printer. Share sends it on WhatsApp, by email or to Drive.
      </Text>
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  head: { alignItems: "center", paddingTop: spacing.xl },
  check: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  title: {
    marginTop: spacing.lg,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    textAlign: "center",
    color: colors.ink,
  },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radii.control,
    backgroundColor: colors.grouped,
  },
  fileText: { flex: 1, minWidth: 0 },
  fileName: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  fileMeta: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  buttons: { gap: 10, marginTop: spacing.lg },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  hint: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.xs,
    ...type.caption,
    fontFamily: fonts.regular,
    textAlign: "center",
    color: colors.ink2,
  },
}));

export default PaperSavedSheet;
