import { Href, router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackBar from "@/components/BackBar";
import PaperPreview from "@/components/PaperPreview";
import { Icon } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import useLetterhead from "@/lib/useLetterhead";
import usePreviewHtml, { type PageMaker } from "@/lib/usePreviewHtml";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { designSummary, type LetterheadDesign, type LetterheadStyle } from "@/utils/letterhead";
import { agreementPages } from "@/utils/paperForms/agreements";

const PREVIEW_WIDTH = 250;

const agreementFirstPage: PageMaker = (details, design, assets) => agreementPages("hotel", details, design, assets)[0];

type Option = {
  style: LetterheadStyle;
  title: string;
  sub: string;
  /** The button in the box under the chosen option, and where it goes */
  edit?: (design: LetterheadDesign) => { label: string; href: Href };
};

const OPTIONS: Option[] = [
  { style: "none", title: "None", sub: "Just the document. Clean and simple." },
  {
    style: "printed",
    title: "My printed paper",
    sub: "Leaves space for your letterhead pad",
    edit: () => ({ label: "Adjust", href: "/letterhead-printed" }),
  },
  {
    style: "make",
    title: "Make one",
    sub: "Pick a design, a picture, your logo and details",
    edit: () => ({ label: "Edit", href: "/letterhead-make" }),
  },
  {
    style: "upload",
    title: "Upload mine",
    sub: "Your own letterhead image, from Canva or a scan",
    edit: (design) => ({ label: design.upload.image ? "Change" : "Choose image", href: "/letterhead-upload" }),
  },
];

/**
 * The Letterhead screen (LetterheadHome board), opened from any paper form:
 * the real page as it will print, the four ways to have a letterhead, the
 * business details, and where the letterhead is used. Every change is kept on
 * this phone at once.
 */
const LetterheadScreen = () => {
  const colors = useColors();
  const styles = useStyles();
  const { details, design, updateDesign } = useLetterhead();
  const html = usePreviewHtml(design, details, PREVIEW_WIDTH, agreementFirstPage);

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <BackBar title="Letterhead" fallback="/paper-forms" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewArea}>
          <PaperPreview
            html={html}
            width={PREVIEW_WIDTH}
            accessibilityLabel={`Rental agreement, page 1, with the letterhead: ${designSummary(design, details)}`}
          />
          <Text style={styles.previewNote}>The real page, as it will print</Text>
          <Text style={styles.previewSub}>Rental agreement, page 1</Text>
        </View>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Style
        </Text>
        <View style={styles.panel} accessibilityRole="radiogroup">
          {OPTIONS.map((option, index) => {
            const chosen = design.style === option.style;
            const edit = chosen && option.edit ? option.edit(design) : null;
            return (
              <View key={option.style} style={index > 0 && styles.divided}>
                <Pressable
                  onPress={() => updateDesign({ style: option.style })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                  accessibilityLabel={`${option.title}. ${option.sub}`}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                >
                  <View style={[styles.radio, chosen && styles.radioOn]}>{chosen && <View style={styles.radioDot} />}</View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSub}>{option.sub}</Text>
                  </View>
                </Pressable>
                {edit && (
                  <View style={styles.summary}>
                    <Text style={styles.summaryText}>{designSummary(design, details)}</Text>
                    <Pressable
                      onPress={() => router.push(edit.href)}
                      accessibilityRole="button"
                      accessibilityLabel={edit.label}
                      style={styles.edit}
                    >
                      <Text style={styles.editText}>{edit.label}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Your details
        </Text>
        <Pressable
          onPress={() => router.push("/letterhead-details")}
          accessibilityRole="button"
          accessibilityLabel={`Your details. ${details.business || "Add your business name"}`}
          style={({ pressed }) => [styles.panel, styles.detailsRow, pressed && styles.pressed]}
        >
          <View style={styles.optionText}>
            <Text style={styles.optionTitle} numberOfLines={1}>
              {details.business || "Add your business name"}
            </Text>
            <Text style={styles.optionSub} numberOfLines={1}>
              {[details.phone, details.email].filter(Boolean).join(" · ") || "Phone, address, email, GST and PAN"}
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
        </Pressable>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Where it’s used
        </Text>
        <View style={styles.panel}>
          {[
            ["Rental agreements", "The full letterhead and its picture on page 1, the small one after"],
            ["Every other form", "Rent card, receipts, handover and registers get the small one, picture included"],
          ].map(([title, sub], index) => (
            <View key={title} style={[styles.used, index > 0 && styles.divided]}>
              <Text style={styles.usedTitle}>{title}</Text>
              <Text style={styles.optionSub}>{sub}</Text>
            </View>
          ))}
        </View>

        <View style={styles.privacy}>
          <Icon name="lock" size={16} color={colors.ink2} strokeWidth={2} />
          <Text style={styles.privacyText}>Kept on this phone. Nothing is uploaded.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  previewArea: { alignItems: "center", paddingTop: 14 },
  previewNote: { marginTop: 10, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.inkBody },
  previewSub: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  groupTitle: {
    ...type.status,
    marginTop: spacing.xxl,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.ink2,
  },
  panel: { borderRadius: radii.panel, backgroundColor: colors.surface, overflow: "hidden" },
  divided: { borderTopWidth: 1, borderTopColor: colors.hairline },
  pressed: { backgroundColor: colors.fillPressed },
  option: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.chevron,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onInk },
  optionText: { flex: 1, minWidth: 0 },
  optionTitle: { ...type.rowTitle, color: colors.ink },
  optionSub: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginLeft: 52,
    marginRight: spacing.lg,
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
    borderRadius: radii.input,
    backgroundColor: colors.grouped,
  },
  summaryText: { flex: 1, ...type.caption, fontFamily: fonts.regular, color: colors.inkBody },
  edit: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md },
  editText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.brandText },
  detailsRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  used: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  usedTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: 18,
  },
  privacyText: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
}));

export default LetterheadScreen;
