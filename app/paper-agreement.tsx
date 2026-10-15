import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { KeyboardTypeOptions, TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AgreementPreview } from "@/components/FormThumbnail";
import PaperActions, { CopiesRow } from "@/components/PaperActions";
import PaperSavedSheet from "@/components/PaperSavedSheet";
import { FormRow, Group, Icon, Segmented } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import { saveAgreement } from "@/lib/paperPdf";
import useLetterhead from "@/lib/useLetterhead";
import usePaperPdf from "@/lib/usePaperPdf";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { LETTERHEAD_LIMITS, type LetterheadKey } from "@/utils/letterhead";
import {
  AGREEMENT_KINDS,
  AGREEMENT_ROW,
  AGREEMENTS,
  isAgreementKind,
  type AgreementKind,
} from "@/utils/paperForms/catalog";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/paper-forms");
};

const KIND_OPTIONS = AGREEMENT_KINDS.map((kind) => ({ value: kind, label: AGREEMENTS[kind].label }));

/** The rows of "Your letterhead", in the order they are printed. */
const LETTERHEAD_ROWS: {
  key: LetterheadKey;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
}[] = [
  { key: "business", label: "Business", placeholder: "Business name", autoCapitalize: "words" },
  { key: "tagline", label: "What you do", placeholder: "Tuning and rentals" },
  { key: "address", label: "Address", placeholder: "Shop address", autoCapitalize: "words" },
  { key: "phone", label: "Phone", placeholder: "One or two numbers", keyboardType: "phone-pad" },
  { key: "email", label: "Email", placeholder: "Optional", keyboardType: "email-address", autoCapitalize: "none" },
  { key: "gst", label: "GST No.", placeholder: "Optional", autoCapitalize: "characters" },
  { key: "pan", label: "PAN", placeholder: "Optional", autoCapitalize: "characters" },
];

/**
 * The rental agreement (PaperAgreement board), opened from Paper forms: the
 * hotel agreement or the one for a private person, with the owner's terms
 * printed (utils/paperForms/agreementTerms.ts) and the business's letterhead
 * at the top; everything about the client, the piano and the money is
 * written by hand. Two copies by default, one for each side.
 */
const PaperAgreement = () => {
  const colors = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<AgreementKind>(isAgreementKind(params.kind) ? params.kind : "hotel");
  const [count, setCount] = useState<number>(AGREEMENT_ROW.defaultCount);
  const { letterhead, change, remember } = useLetterhead();
  const agreement = AGREEMENTS[kind];

  const pdf = usePaperPdf(async () => {
    await remember();
    return saveAgreement(kind, letterhead, count);
  });

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <View style={styles.bar}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="chevronLeft" size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.barTitle} accessibilityRole="header" numberOfLines={1}>
          {AGREEMENT_ROW.title}
        </Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Segmented
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
          accessibilityLabel="Who the agreement is with"
          style={styles.choice}
        />
        <Text style={styles.note}>{agreement.note}</Text>

        <View style={styles.previewArea}>
          <AgreementPreview kind={kind} />
          <Text style={styles.previewNote}>A4 · 2 pages · your terms are printed</Text>
        </View>

        <Group
          title="Your letterhead"
          footer="Printed at the top of both agreements, and the business and phone on every form. Leave any empty to write by hand. Kept on this phone only."
          labelWidth={100}
          style={styles.section}
        >
          {LETTERHEAD_ROWS.map((row) => (
            <FormRow
              key={row.key}
              label={row.label}
              placeholder={row.placeholder}
              input={{
                value: letterhead[row.key],
                onChangeText: change(row.key),
                onEndEditing: remember,
                maxLength: LETTERHEAD_LIMITS[row.key],
                keyboardType: row.keyboardType,
                autoCapitalize: row.autoCapitalize ?? "sentences",
                autoCorrect: false,
                returnKeyType: "done",
              }}
            />
          ))}
        </Group>

        <CopiesRow label="Copies" hint="One for each side to keep" value={count} onChange={setCount} />

        <PaperActions busy={pdf.busy} onSave={pdf.save} onPrint={pdf.print} onShare={pdf.share} />
      </ScrollView>

      <PaperSavedSheet
        visible={pdf.sheetOpen}
        pdf={pdf.pdf}
        title={agreement.title}
        onOpen={pdf.openSaved}
        onPrint={pdf.printSaved}
        onShare={pdf.shareSaved}
        onClose={pdf.closeSheet}
      />
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  bar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  barTitle: { ...type.sheetTitle, flex: 1, textAlign: "center", color: colors.ink },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  choice: { marginTop: spacing.sm },
  note: {
    marginTop: spacing.sm,
    ...type.caption,
    fontFamily: fonts.regular,
    textAlign: "center",
    color: colors.ink2,
  },
  previewArea: { alignItems: "center", paddingTop: spacing.lg },
  previewNote: {
    marginTop: 10,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkBody,
  },
  section: { marginTop: spacing.xxl },
}));

export default PaperAgreement;
