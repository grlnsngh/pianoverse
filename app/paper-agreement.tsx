import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackBar from "@/components/BackBar";
import LetterheadRow from "@/components/LetterheadRow";
import PaperActions, { CopiesRow } from "@/components/PaperActions";
import PaperPreview from "@/components/PaperPreview";
import PaperSavedSheet from "@/components/PaperSavedSheet";
import { Segmented } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import { saveAgreement } from "@/lib/paperPdf";
import useLetterhead from "@/lib/useLetterhead";
import usePaperPdf from "@/lib/usePaperPdf";
import usePreviewHtml, { type PageMaker } from "@/lib/usePreviewHtml";
import { makeStyles } from "@/lib/ThemeContext";
import { agreementPages } from "@/utils/paperForms/agreements";
import {
  AGREEMENT_KINDS,
  AGREEMENT_ROW,
  AGREEMENTS,
  isAgreementKind,
  type AgreementKind,
} from "@/utils/paperForms/catalog";

const PREVIEW_WIDTH = 150;

const KIND_OPTIONS = AGREEMENT_KINDS.map((kind) => ({ value: kind, label: AGREEMENTS[kind].label }));

/** Pages 1 and 2 of each agreement, made once so the previews aren't rebuilt on every render. */
const PAGE_MAKERS: Record<AgreementKind, [PageMaker, PageMaker]> = {
  hotel: [
    (details, design, assets) => agreementPages("hotel", details, design, assets)[0],
    (details, design, assets) => agreementPages("hotel", details, design, assets)[1],
  ],
  private: [
    (details, design, assets) => agreementPages("private", details, design, assets)[0],
    (details, design, assets) => agreementPages("private", details, design, assets)[1],
  ],
};

/**
 * The rental agreement (PaperAgreement board), opened from Paper forms: the
 * hotel agreement or the one for a private person, with the owner's terms
 * printed (utils/paperForms/agreementTerms.ts) on the letterhead; everything
 * about the client, the piano and the money is written by hand. Two copies by
 * default, one for each side.
 */
const PaperAgreement = () => {
  const styles = useStyles();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<AgreementKind>(isAgreementKind(params.kind) ? params.kind : "hotel");
  const [count, setCount] = useState<number>(AGREEMENT_ROW.defaultCount);
  const { details, design } = useLetterhead();
  const agreement = AGREEMENTS[kind];
  const first = usePreviewHtml(design, details, PREVIEW_WIDTH, PAGE_MAKERS[kind][0]);
  const second = usePreviewHtml(design, details, PREVIEW_WIDTH, PAGE_MAKERS[kind][1]);

  const pdf = usePaperPdf(() => saveAgreement(kind, details, count, design));

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <BackBar title={AGREEMENT_ROW.title} fallback="/paper-forms" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Segmented
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
          accessibilityLabel="Who the agreement is with"
          style={styles.choice}
        />
        <Text style={styles.note}>{agreement.note}</Text>

        <View style={styles.previews}>
          <PaperPreview html={first} width={PREVIEW_WIDTH} accessibilityLabel={`${agreement.title}, page 1`} />
          <PaperPreview html={second} width={PREVIEW_WIDTH} accessibilityLabel={`${agreement.title}, page 2`} />
        </View>
        <Text style={styles.previewNote}>The real pages · A4 · your terms printed</Text>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Letterhead
        </Text>
        <LetterheadRow design={design} details={details} hint="Full on page 1, small on the pages after" />

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
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  choice: { marginTop: spacing.sm },
  note: {
    marginTop: spacing.sm,
    ...type.caption,
    fontFamily: fonts.regular,
    textAlign: "center",
    color: colors.ink2,
  },
  previews: { flexDirection: "row", justifyContent: "center", gap: spacing.md, paddingTop: spacing.lg },
  previewNote: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkBody,
  },
  groupTitle: {
    ...type.status,
    marginTop: spacing.xxl,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.ink2,
  },
}));

export default PaperAgreement;
