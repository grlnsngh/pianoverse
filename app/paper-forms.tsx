import { Href, router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FormThumbnail, { KitThumbnail } from "@/components/FormThumbnail";
import PaperSavedSheet from "@/components/PaperSavedSheet";
import { Button, Icon } from "@/components/ui";
import type { IconName } from "@/components/ui";
import { fonts, maxScale, radii, spacing, type } from "@/constants/theme";
import LetterheadRow from "@/components/LetterheadRow";
import { savePaperKit } from "@/lib/paperPdf";
import useLetterhead from "@/lib/useLetterhead";
import usePaperPdf from "@/lib/usePaperPdf";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import {
  AGREEMENT_ROW,
  FULL_KIT,
  PAPER_FORMS,
  pagesText,
  type FormThumbnailKind,
} from "@/utils/paperForms/catalog";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/profile");
};

/** "One form at a time": the five forms, then the rental agreement, each to its own screen. */
const LIST: { key: string; title: string; summary: string; thumbnail: FormThumbnailKind; href: Href }[] = [
  ...PAPER_FORMS.map((form) => ({
    key: form.id,
    title: form.title,
    summary: form.summary,
    thumbnail: form.thumbnail,
    href: `/paper-form/${form.id}` as Href,
  })),
  {
    key: "agreement",
    title: AGREEMENT_ROW.title,
    summary: AGREEMENT_ROW.summary,
    thumbnail: AGREEMENT_ROW.thumbnail,
    href: "/paper-agreement",
  },
];

const Tip = ({ icon, title, text }: { icon: IconName; title: string; text: string }) => {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.tip}>
      <Icon name={icon} size={24} color={colors.ink} />
      <View style={styles.tipText}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipBody}>{text}</Text>
      </View>
    </View>
  );
};

/**
 * Paper forms (PaperForms board), opened from Account: blank forms laid out
 * like the app, to print and fill in by hand, for those who would rather not
 * keep their customers in an app. The full kit at the top, then each form on
 * its own screen.
 */
const PaperForms = () => {
  const colors = useColors();
  const styles = useStyles();
  const { details, design } = useLetterhead();
  const kit = usePaperPdf(() => savePaperKit(details, design), "kit");

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <View style={styles.bar}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="chevronLeft" size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={maxScale.title}
        >
          Paper forms
        </Text>
        <Text style={styles.lead}>
          Prefer pen and paper? Print these and fill them in by hand. The columns match the app.
        </Text>

        <View style={styles.kit}>
          <View style={styles.kitHead}>
            <KitThumbnail />
            <View style={styles.kitText}>
              <Text style={styles.kitName}>The full kit</Text>
              <Text style={styles.kitMeta}>
                All {FULL_KIT.forms} forms in one PDF, {pagesText(FULL_KIT.pages)}
              </Text>
            </View>
          </View>
          <Button
            title="Get the full kit"
            loading={kit.busy === "save"}
            loadingTitle="Making PDF"
            onPress={kit.save}
            style={styles.kitButton}
          />
        </View>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Your letterhead
        </Text>
        <LetterheadRow
          design={design}
          details={details}
          hint="On every form and agreement"
        />

        <Text style={styles.groupTitle} accessibilityRole="header">
          One form at a time
        </Text>
        <View style={styles.panel}>
          {LIST.map((row, index) => (
            <Pressable
              key={row.key}
              onPress={() => router.push(row.href)}
              accessibilityRole="button"
              accessibilityLabel={`${row.title}. ${row.summary}`}
              style={({ pressed }) => [
                styles.formRow,
                index > 0 && styles.divided,
                pressed && styles.pressed,
              ]}
            >
              <FormThumbnail kind={row.thumbnail} />
              <View style={styles.formText}>
                <Text style={styles.formTitle}>{row.title}</Text>
                <Text style={styles.formSummary}>{row.summary}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Good to know
        </Text>
        <View style={styles.panel}>
          <Tip
            icon="printer"
            title="Print at home or at a shop"
            text="Print sends it to a Wi-Fi printer. Share sends it on WhatsApp, by email or to Drive."
          />
          <View style={styles.divider} />
          <Tip
            icon="lock"
            title="Private by design"
            text="Forms are made on this phone, and what you write stays on paper. Pianoverse counts which forms are used, never what’s on them."
          />
        </View>
      </ScrollView>

      <PaperSavedSheet
        visible={kit.sheetOpen}
        pdf={kit.pdf}
        title={FULL_KIT.title}
        onOpen={kit.openSaved}
        onPrint={kit.printSaved}
        onShare={kit.shareSaved}
        onClose={kit.closeSheet}
      />
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  bar: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  title: { ...type.largeTitle, paddingTop: spacing.xs, color: colors.ink },
  lead: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink2,
  },
  kit: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  kitHead: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  kitText: { flex: 1 },
  kitName: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.ink },
  kitMeta: { ...type.secondary, color: colors.ink2 },
  kitButton: { marginTop: 14 },
  groupTitle: {
    ...type.status,
    marginTop: spacing.xxl,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.ink2,
  },
  panel: { borderRadius: radii.panel, backgroundColor: colors.surface, overflow: "hidden" },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 80,
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.hairline },
  pressed: { backgroundColor: colors.grouped },
  formText: { flex: 1, minWidth: 0 },
  formTitle: { ...type.rowTitle, color: colors.ink },
  formSummary: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  divider: { height: 1, backgroundColor: colors.hairline },
  tip: { flexDirection: "row", gap: 14, paddingVertical: 14, paddingHorizontal: spacing.lg },
  tipText: { flex: 1 },
  tipTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  tipBody: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
}));

export default PaperForms;
