import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import LabelPreview from "@/components/LabelPreview";
import PaperSavedSheet from "@/components/PaperSavedSheet";
import { Button, Segmented, Sheet, Stepper, Switch } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { saveLabelTestSheet, savePianoLabels } from "@/lib/paperPdf";
import useLetterhead from "@/lib/useLetterhead";
import usePaperPdf from "@/lib/usePaperPdf";
import { makeStyles } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";
import type { PianoItem } from "@/redux/pianos/types";
import {
  clampLabels,
  hasContact,
  labelContent,
  labelsFor,
  LABEL_SHEETS,
  LABEL_SIZES,
  MAX_LABELS_EACH,
  perSheet,
  sheetsFor,
  type LabelSizeId,
} from "@/utils/qrLabels";

const SIZE_OPTIONS = LABEL_SIZES.map((id) => ({ value: id, label: LABEL_SHEETS[id].label }));

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export type PrintLabelsSheetProps = {
  visible: boolean;
  /** The pianos chosen on the Pianos tab */
  pianos: PianoItem[];
  onClose: () => void;
};

/**
 * Print labels (QrPrint board), opened from the Pianos tab while pianos are
 * chosen: the sheet size, how many labels of each, whether the label says who
 * to call (the Letterhead's business name and phone), and the label as it will
 * look. Make labels makes the PDF and says it is ready (Open, Print, Share); the
 * test sheet goes straight to the phone's print screen, to try on plain paper.
 */
const PrintLabelsSheet = ({ visible, pianos, onClose }: PrintLabelsSheetProps) => {
  const styles = useStyles();
  const { large } = useTextScale();
  const { details } = useLetterhead();
  const [size, setSize] = useState<LabelSizeId>("large");
  const [each, setEach] = useState(1);
  const [withBusiness, setWithBusiness] = useState(true);

  // One of each, to start with, every time it opens
  useEffect(() => {
    if (visible) setEach(1);
  }, [visible]);

  const labels = useMemo(() => labelsFor(pianos, details, withBusiness, each), [pianos, details, withBusiness, each]);
  const sample = useMemo(
    () => (pianos[0] ? labelContent(pianos[0], details, withBusiness) : null),
    [pianos, details, withBusiness]
  );
  // Nothing to say about who to call when no phone or business is set
  const canContact = !!(details.phone.trim() || details.business.trim());

  const pdf = usePaperPdf(() => savePianoLabels(labels, size), null);
  const test = usePaperPdf(() => saveLabelTestSheet(size, sample ?? labelContent(pianos[0], details, false)), null);
  const busy = pdf.busy !== null || test.busy !== null;

  const sheets = sheetsFor(labels.length, size);
  const summary = [
    count(pianos.length, "piano", "pianos"),
    ...(each > 1 ? [count(labels.length, "label", "labels")] : []),
    count(sheets, "sheet", "sheets"),
  ].join(" · ");

  return (
    <>
      <Sheet
        visible={visible && !pdf.sheetOpen}
        onClose={onClose}
        title="Print labels"
        footer={
          <View style={styles.footer}>
            <Button
              title="Make labels"
              loadingTitle="Making labels"
              loading={pdf.busy === "save"}
              disabled={busy && pdf.busy !== "save"}
              onPress={pdf.save}
            />
            <Button
              title="Print a test sheet first"
              variant="text"
              tone="brand"
              size="compact"
              loading={test.busy === "print"}
              loadingTitle="Making the test sheet"
              disabled={busy && test.busy !== "print"}
              onPress={test.print}
            />
          </View>
        }
      >
        <Text style={styles.summary}>{summary}</Text>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Labels per sheet
        </Text>
        <Segmented
          options={SIZE_OPTIONS}
          value={size}
          onChange={setSize}
          accessibilityLabel="Labels per sheet"
        />
        <Text style={styles.caption}>
          A4 sticker sheets. {perSheet(LABEL_SHEETS.large)} labels are {LABEL_SHEETS.large.width} × {LABEL_SHEETS.large.height} mm;{" "}
          {perSheet(LABEL_SHEETS.small)} labels are {LABEL_SHEETS.small.width} × {LABEL_SHEETS.small.height} mm.
        </Text>

        <View style={styles.group}>
          <View style={[styles.row, large && styles.rowStacked]}>
            <Text style={styles.rowLabel}>Labels of each</Text>
            <Stepper value={each} onChange={(value) => setEach(clampLabels(value))} min={1} max={MAX_LABELS_EACH} unit="labels" />
          </View>
          <View style={styles.hairline} />
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabelDark}>Business name and phone</Text>
              <Text style={styles.rowHint}>
                {canContact
                  ? "“If found, call…” from your Letterhead details"
                  : "Not set yet. Add them under Letterhead, Your details"}
              </Text>
            </View>
            <Switch
              value={withBusiness && canContact}
              onValueChange={setWithBusiness}
              disabled={!canContact}
              accessibilityLabel="Business name and phone"
            />
          </View>
        </View>

        {sample && (
          <View style={styles.preview}>
            <LabelPreview label={sample} size={size} testID="label-preview" />
          </View>
        )}
        <Text style={styles.previewNote}>
          {sample && hasContact(sample) ? "Looks like this on the sticker." : "Looks like this on the sticker, with no phone to call."}
        </Text>
      </Sheet>

      <PaperSavedSheet
        visible={pdf.sheetOpen}
        pdf={pdf.pdf}
        title="Labels"
        verb="are"
        onOpen={pdf.openSaved}
        onPrint={pdf.printSaved}
        onShare={pdf.shareSaved}
        onClose={pdf.closeSheet}
      />
    </>
  );
};

const useStyles = makeStyles((colors) => ({
  footer: { gap: 2 },
  summary: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  groupTitle: {
    ...type.status,
    marginTop: spacing.lg,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    color: colors.ink2,
  },
  caption: {
    ...type.caption,
    fontFamily: fonts.regular,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
    color: colors.ink2,
  },
  group: { marginTop: spacing.lg, borderRadius: radii.card, backgroundColor: colors.surface },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 6,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  // A big Font size puts the stepper under its label
  rowStacked: { flexDirection: "column", alignItems: "flex-start", paddingRight: spacing.lg },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { ...type.body, color: colors.ink2 },
  rowLabelDark: { ...type.body, color: colors.ink },
  rowHint: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  hairline: { height: 1, marginLeft: spacing.lg, backgroundColor: colors.hairline },
  preview: {
    marginTop: spacing.lg,
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  previewNote: {
    ...type.caption,
    fontFamily: fonts.regular,
    marginTop: 6,
    marginBottom: spacing.sm,
    textAlign: "center",
    color: colors.ink2,
  },
}));

export default PrintLabelsSheet;
