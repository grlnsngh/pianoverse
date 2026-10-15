import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackBar from "@/components/BackBar";
import { LetterheadThumbnail } from "@/components/FormThumbnail";
import PaperPreview from "@/components/PaperPreview";
import { Icon, Segmented, Spinner } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { deleteLetterheadImage, letterheadImageUri, pickLetterheadImage } from "@/lib/letterheadImages";
import useLetterhead from "@/lib/useLetterhead";
import usePreviewHtml, { type PageMaker } from "@/lib/usePreviewHtml";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import {
  initialsOf,
  LETTERHEAD_COLOURS,
  LETTERHEAD_TEMPLATES,
  type LetterheadDesign,
} from "@/utils/letterhead";
import { agreementPages } from "@/utils/paperForms/agreements";
import { showToast } from "@/utils/toast";

/** The top of an A4 page, where the letterhead is */
const TOP_OF_PAGE = 445;

const agreementFirstPage: PageMaker = (details, design, assets) => agreementPages("hotel", details, design, assets)[0];

const LETTERING = [
  { value: "clean", label: "Clean" },
  { value: "elegant", label: "Elegant" },
] as const;

/**
 * Make a letterhead (LetterheadMake board), opened from the Letterhead
 * screen: one of five designs, a colour, the logo (or the initials), and the
 * lettering, with the top of the real page above. Saved as it changes.
 */
const LetterheadMake = () => {
  const colors = useColors();
  const styles = useStyles();
  const { width: screen } = useWindowDimensions();
  const { details, design, updateDesign } = useLetterhead();
  const [picking, setPicking] = useState(false);
  const previewWidth = Math.min(350, screen - spacing.screen * 2);
  const made = useMemo<LetterheadDesign>(() => ({ ...design, style: "make" }), [design]);
  const html = usePreviewHtml(made, details, previewWidth, agreementFirstPage);
  const initials = initialsOf(details.business);

  const chooseLogo = async () => {
    setPicking(true);
    try {
      const image = await pickLetterheadImage("logo");
      if (image) {
        deleteLetterheadImage(design.logo);
        updateDesign({ logo: image, style: "make" });
      }
    } catch (error) {
      console.warn("Could not add the logo:", error);
      showToast("Couldn’t add that image. Try another.", { variant: "error" });
    } finally {
      setPicking(false);
    }
  };

  const removeLogo = () => {
    deleteLetterheadImage(design.logo);
    updateDesign({ logo: null });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <BackBar title="Make a letterhead" fallback="/letterhead" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewArea}>
          <PaperPreview
            html={html}
            width={previewWidth}
            visibleHeight={TOP_OF_PAGE}
            accessibilityLabel="The top of a page with your letterhead"
          />
          <Text style={styles.previewNote}>The top of an A4 page, as it will print</Text>
        </View>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Design
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.designs}>
          {LETTERHEAD_TEMPLATES.map((template) => {
            const chosen = design.template === template.id;
            return (
              <Pressable
                key={template.id}
                onPress={() => updateDesign({ template: template.id, style: "make" })}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen }}
                accessibilityLabel={`${template.name} design`}
                style={[styles.design, chosen && styles.designOn]}
              >
                <LetterheadThumbnail design={{ ...made, template: template.id }} initials={initials} large />
                <Text style={[styles.designName, chosen && styles.designNameOn]}>{template.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Colour
        </Text>
        <View style={styles.swatches}>
          {LETTERHEAD_COLOURS.map((colour) => {
            const chosen = design.colour === colour.id;
            return (
              <Pressable
                key={colour.id}
                onPress={() => updateDesign({ colour: colour.id, style: "make" })}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen }}
                accessibilityLabel={colour.name}
                style={styles.swatchTouch}
              >
                <View style={[styles.swatchRing, chosen && { borderColor: colors.ink }]}>
                  <View style={[styles.swatch, { backgroundColor: colour.accent }]} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Logo
        </Text>
        <View style={[styles.panel, styles.logoRow]}>
          <View style={styles.logoBox}>
            {design.logo ? (
              <Image
                source={{ uri: letterheadImageUri(design.logo) }}
                style={styles.logoImage}
                contentFit="contain"
                accessibilityLabel="Your logo"
              />
            ) : (
              <Text style={styles.logoInitials}>{initials || "Aa"}</Text>
            )}
          </View>
          <View style={styles.logoText}>
            <Text style={styles.rowTitle}>{design.logo ? "Your logo" : "No logo"}</Text>
            <Text style={styles.rowSub}>{design.logo ? "A clear background looks best" : "Your initials are used"}</Text>
          </View>
          {picking ? (
            <Spinner size={20} accessibilityLabel="Adding the logo" />
          ) : (
            <View style={styles.logoActions}>
              {design.logo && (
                <Pressable onPress={removeLogo} accessibilityRole="button" accessibilityLabel="Remove the logo" style={styles.textButton}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              )}
              <Pressable
                onPress={chooseLogo}
                accessibilityRole="button"
                accessibilityLabel={design.logo ? "Change the logo" : "Add a logo"}
                style={styles.textButton}
              >
                <Text style={styles.textButtonText}>{design.logo ? "Change" : "Add"}</Text>
              </Pressable>
            </View>
          )}
        </View>
        <Text style={styles.groupFooter}>A PNG or JPG from your photos. No logo? Your initials are used instead.</Text>

        <Text style={styles.groupTitle} accessibilityRole="header">
          Lettering
        </Text>
        <Segmented
          options={LETTERING}
          value={design.elegant ? "elegant" : "clean"}
          onChange={(value) => updateDesign({ elegant: value === "elegant", style: "make" })}
          accessibilityLabel="Lettering of the details"
        />

        <Text style={styles.groupTitle} accessibilityRole="header">
          Your details
        </Text>
        <Pressable
          onPress={() => router.push("/letterhead-details")}
          accessibilityRole="button"
          accessibilityLabel={`Your details. ${details.business || "Add your business name"}`}
          style={({ pressed }) => [styles.panel, styles.detailsRow, pressed && styles.pressed]}
        >
          <View style={styles.logoText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {details.business || "Add your business name"}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {[details.tagline, details.phone].filter(Boolean).join(" · ") || "What you do, phone, address, GST and PAN"}
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
        </Pressable>

        <View style={styles.privacy}>
          <Icon name="lock" size={16} color={colors.ink2} strokeWidth={2} />
          <Text style={styles.privacyText}>Saved as you go, on this phone.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  previewArea: { alignItems: "center", paddingTop: spacing.md },
  previewNote: { marginTop: spacing.sm, ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
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
  designs: { gap: 10, paddingRight: spacing.screen },
  design: {
    width: 84,
    alignItems: "center",
    gap: 6,
    paddingTop: spacing.sm,
    paddingBottom: 6,
    borderRadius: radii.control,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.surface,
  },
  designOn: { borderColor: colors.ink },
  designName: { ...type.caption, color: colors.ink },
  designNameOn: { fontFamily: fonts.bold },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  swatchTouch: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  panel: { borderRadius: radii.card, backgroundColor: colors.surface, overflow: "hidden" },
  pressed: { backgroundColor: colors.fillPressed },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: spacing.md },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: radii.input,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.grouped,
    overflow: "hidden",
  },
  logoImage: { width: 48, height: 48 },
  logoInitials: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink2 },
  logoText: { flex: 1, minWidth: 0 },
  rowTitle: { ...type.rowTitle, color: colors.ink },
  rowSub: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  logoActions: { flexDirection: "row" },
  textButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  textButtonText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.brandText },
  removeText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.late },
  detailsRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: 18,
  },
  privacyText: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
}));

export default LetterheadMake;
