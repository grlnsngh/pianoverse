import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackBar from "@/components/BackBar";
import LetterheadRow from "@/components/LetterheadRow";
import PaperActions, { CopiesRow } from "@/components/PaperActions";
import PaperPreview from "@/components/PaperPreview";
import PaperSavedSheet from "@/components/PaperSavedSheet";
import { StateView } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import { savePaperForm } from "@/lib/paperPdf";
import useLetterhead from "@/lib/useLetterhead";
import useCountFormOpened from "@/lib/useCountFormOpened";
import usePaperPdf from "@/lib/usePaperPdf";
import usePreviewHtml, { type PageMaker } from "@/lib/usePreviewHtml";
import { makeStyles } from "@/lib/ThemeContext";
import { paperFormById, type PaperForm, type PaperFormId } from "@/utils/paperForms/catalog";
import { formPages } from "@/utils/paperForms/forms";

const PREVIEW_WIDTH = 250;

/** One page maker per form, made once, so the preview isn't rebuilt on every render. */
const PAGE_MAKERS = new Map<PaperFormId, PageMaker>();
const pageMakerFor = (id: PaperFormId): PageMaker => {
  let maker = PAGE_MAKERS.get(id);
  if (!maker) {
    maker = (details, design, assets) => formPages(id, details, 1, design, assets)[0];
    PAGE_MAKERS.set(id, maker);
  }
  return maker;
};

/** Where the letterhead goes on each form, for the row under the preview. */
const LETTERHEAD_HINT: Record<PaperFormId, string> = {
  rent_card: "The small version goes on this form",
  receipts: "The small version goes on each receipt",
  piano_register: "The small version goes on this form",
  rental_register: "The small version goes on this form",
  handover: "The small version goes on this form",
};

/** A form's screen, once the form is known. */
const PaperFormScreen = ({ form }: { form: PaperForm }) => {
  const styles = useStyles();
  const { details, design } = useLetterhead();
  const [count, setCount] = useState(form.defaultCount);
  const html = usePreviewHtml(design, details, PREVIEW_WIDTH, pageMakerFor(form.id));

  const pdf = usePaperPdf(() => savePaperForm(form.id, details, count, design), form.id);
  useCountFormOpened(form.id);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewArea}>
          <PaperPreview html={html} width={PREVIEW_WIDTH} accessibilityLabel={`${form.title}, the page as it will print`} />
          <Text style={styles.previewNote}>The real page · A4 · {form.pageNote}</Text>
          <Text style={styles.previewContents}>{form.contents}</Text>
        </View>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Letterhead
        </Text>
        <LetterheadRow design={design} details={details} hint={LETTERHEAD_HINT[form.id]} />
        <Text style={styles.groupFooter}>Changing it here changes it on every form.</Text>

        <CopiesRow label={form.countLabel} hint={form.countHint} value={count} onChange={setCount} />

        <PaperActions busy={pdf.busy} onSave={pdf.save} onPrint={pdf.print} onShare={pdf.share} />
      </ScrollView>

      <PaperSavedSheet
        visible={pdf.sheetOpen}
        pdf={pdf.pdf}
        title={form.title}
        onOpen={pdf.openSaved}
        onPrint={pdf.printSaved}
        onShare={pdf.shareSaved}
        onClose={pdf.closeSheet}
      />
    </>
  );
};

/**
 * One paper form (PaperFormDetail board), opened from Paper forms: the real
 * page as it will print, the letterhead it carries, how many copies, and
 * Save PDF, Print and Share.
 */
const PaperFormDetail = () => {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const form = paperFormById(id);

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <BackBar title={form?.title ?? "Paper forms"} fallback="/paper-forms" />
      {form ? (
        <PaperFormScreen form={form} />
      ) : (
        <StateView
          icon="document"
          title="This form isn’t here"
          message="It may have been renamed. Pick it again from the list."
          actionLabel="See all forms"
          actionVariant="secondary"
          onAction={() => router.replace("/paper-forms")}
        />
      )}
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  previewArea: { alignItems: "center", paddingTop: spacing.lg },
  previewNote: {
    marginTop: 10,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkBody,
  },
  previewContents: {
    ...type.caption,
    fontFamily: fonts.regular,
    textAlign: "center",
    color: colors.ink2,
  },
  groupTitle: {
    ...type.status,
    marginTop: spacing.xxl,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.ink2,
  },
  groupFooter: {
    ...type.caption,
    fontFamily: fonts.regular,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    color: colors.ink2,
  },
}));

export default PaperFormDetail;
