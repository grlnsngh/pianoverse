import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { LetterheadThumbnail } from "@/components/FormThumbnail";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { makeStyles } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";
import { designSummary, initialsOf, type Letterhead, type LetterheadDesign } from "@/utils/letterhead";

type LetterheadRowProps = {
  design: LetterheadDesign;
  details: Letterhead;
  /** Under the summary: where this screen's form uses it */
  hint: string;
  testID?: string;
};

/**
 * The letterhead on a form's screen (PaperForms, PaperFormDetail and
 * PaperAgreement boards): a small drawing of it, what it is, and Change,
 * which opens the Letterhead screen. Changing it there changes it on every form.
 */
const LetterheadRow = ({ design, details, hint, testID }: LetterheadRowProps) => {
  const styles = useStyles();
  const { large } = useTextScale();
  const summary = designSummary(design, details);
  return (
    <Pressable
      onPress={() => router.push("/letterhead")}
      accessibilityRole="button"
      accessibilityLabel={`Letterhead: ${summary}. ${hint}`}
      accessibilityHint="Change it for every form"
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <LetterheadThumbnail design={design} initials={initialsOf(details.business)} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={large ? 2 : 1}>
          {summary}
        </Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Text style={styles.change}>Change</Text>
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  row: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.fillPressed },
  text: { flex: 1, minWidth: 0 },
  title: { ...type.rowTitle, color: colors.ink },
  hint: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  change: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.brandText },
}));

export default LetterheadRow;
