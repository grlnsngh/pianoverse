import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormPreview } from "@/components/FormThumbnail";
import PaperActions, { CopiesRow } from "@/components/PaperActions";
import PaperSavedSheet from "@/components/PaperSavedSheet";
import { FormRow, Group, Icon, StateView } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import { savePaperForm } from "@/lib/paperPdf";
import useLetterhead from "@/lib/useLetterhead";
import usePaperPdf from "@/lib/usePaperPdf";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { LETTERHEAD_LIMITS } from "@/utils/letterhead";
import { paperFormById, type PaperForm } from "@/utils/paperForms/catalog";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/paper-forms");
};

/** A form's screen, once the form is known. */
const PaperFormScreen = ({ form }: { form: PaperForm }) => {
  const styles = useStyles();
  const { letterhead, change, remember } = useLetterhead();
  const [count, setCount] = useState(form.defaultCount);

  const pdf = usePaperPdf(async () => {
    await remember();
    return savePaperForm(form.id, letterhead, count);
  });

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewArea}>
          <FormPreview id={form.id} />
          <Text style={styles.previewNote}>A4 · {form.pageNote}</Text>
          <Text style={styles.previewContents}>{form.contents}</Text>
        </View>

        <Group
          title="Printed at the top"
          footer="Leave them empty to write by hand. Kept on this phone only."
          style={styles.section}
        >
          <FormRow
            label="Business"
            placeholder="Your business name"
            input={{
              value: letterhead.business,
              onChangeText: change("business"),
              onEndEditing: remember,
              maxLength: LETTERHEAD_LIMITS.business,
              autoCapitalize: "words",
              returnKeyType: "done",
            }}
          />
          <FormRow
            label="Phone"
            placeholder="Optional"
            input={{
              value: letterhead.phone,
              onChangeText: change("phone"),
              onEndEditing: remember,
              maxLength: LETTERHEAD_LIMITS.phone,
              keyboardType: "phone-pad",
              returnKeyType: "done",
            }}
          />
        </Group>

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
 * One paper form (PaperFormDetail board), opened from Paper forms: a drawing
 * of the page, the business name and phone to print at the top, how many
 * copies, and Save PDF, Print and Share.
 */
const PaperFormDetail = () => {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const form = paperFormById(id);

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <View style={styles.bar}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="chevronLeft" size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.barTitle} accessibilityRole="header" numberOfLines={1}>
          {form?.title ?? "Paper forms"}
        </Text>
        <View style={styles.back} />
      </View>

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
  section: { marginTop: spacing.xxl },
}));

export default PaperFormDetail;
