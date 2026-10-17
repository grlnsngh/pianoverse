import { Image } from "expo-image";
import { Href, router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackBar from "@/components/BackBar";
import { LetterheadThumbnail } from "@/components/FormThumbnail";
import PaperPreview from "@/components/PaperPreview";
import PictureSettings from "@/components/PictureSettings";
import { Button, Icon, Segmented, Spinner } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { deleteLetterheadImage, letterheadImageUri, pickLetterheadImage } from "@/lib/letterheadImages";
import useLetterhead from "@/lib/useLetterhead";
import usePreviewHtml, { type PageMaker } from "@/lib/usePreviewHtml";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import {
  designSummary,
  initialsOf,
  LETTERHEAD_COLOURS,
  LETTERHEAD_TEMPLATES,
  printedPicture,
  type LetterheadDesign,
  type LetterheadStyle,
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

/** The other kinds of letterhead, for those who already have one or want none. */
const OTHER_KINDS: { style: Exclude<LetterheadStyle, "make">; title: string; sub: string; href?: Href }[] = [
  {
    style: "upload",
    title: "My own letterhead image",
    sub: "A page or top strip made in Canva, or a scan",
    href: "/letterhead-upload",
  },
  {
    style: "printed",
    title: "Printed letterhead paper",
    sub: "Leaves space for the letterhead on your pad",
    href: "/letterhead-printed",
  },
  { style: "none", title: "No letterhead", sub: "Just the document" },
];

/** What the kind in use does, under its name. */
const inUseDetail = (design: LetterheadDesign): string => {
  if (design.style === "printed") {
    return `${design.printed.top} mm left empty at the top and ${design.printed.bottom} mm at the bottom`;
  }
  if (design.style === "upload") {
    if (!design.upload.image) return "No image chosen yet, so nothing is printed at the top";
    return design.upload.kind === "page" ? "Your image fills the page" : "Your image across the top";
  }
  return "Just the document, with your business name on a line at the top";
};

/**
 * The Letterhead screen, opened from any paper form (simplified in Batch 48,
 * when the owner found two screens and an Edit button in a box hard to
 * follow): the real page as it will print, and right under it everything to
 * make a letterhead, in the order it matters: your details, the design and
 * colour, the picture, and the logo and lettering under More options. The
 * other kinds of letterhead (your own image, printed paper, none) are a short
 * list at the end. Every change is kept on this phone at once.
 */
const LetterheadScreen = () => {
  const colors = useColors();
  const styles = useStyles();
  const { width: screen } = useWindowDimensions();
  const { details, design, updateDesign } = useLetterhead();
  const [more, setMore] = useState(false);
  const [picking, setPicking] = useState(false);
  const making = design.style === "make";
  const previewWidth = Math.min(350, screen - spacing.screen * 2);
  // A picture behind the writing, a page image or a pad's spaces are seen on the whole page
  const wholePage = !making || printedPicture(design)?.place === "behind";
  const html = usePreviewHtml(design, details, previewWidth, agreementFirstPage);
  const initials = initialsOf(details.business);
  const made = useMemo(() => ({ ...design, style: "make" as const }), [design]);
  const inUse = OTHER_KINDS.find((kind) => kind.style === design.style);

  const chooseLogo = async () => {
    setPicking(true);
    try {
      const image = await pickLetterheadImage("logo");
      if (image) {
        deleteLetterheadImage(design.logo);
        updateDesign({ logo: image });
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

  const detailsRow = (
    <Pressable
      onPress={() => router.push("/letterhead-details")}
      accessibilityRole="button"
      accessibilityLabel={`Your details. ${details.business || "Add your business name"}`}
      style={({ pressed }) => [styles.panel, styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, !details.business && styles.rowTitleMissing]}>
          {details.business || "Add your business name"}
        </Text>
        <Text style={styles.rowSub}>
          {[details.tagline, details.phone].filter(Boolean).join(" · ") || "What you do, phone, address, GST and PAN"}
        </Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
    </Pressable>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <BackBar title="Letterhead" fallback="/paper-forms" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewArea}>
          <PaperPreview
            html={html}
            width={previewWidth}
            visibleHeight={wholePage ? undefined : TOP_OF_PAGE}
            accessibilityLabel={`Rental agreement, page 1, with the letterhead: ${designSummary(design, details)}`}
          />
          <Text style={styles.previewNote}>
            {wholePage ? "An A4 page, as it will print" : "The top of an A4 page, as it will print"}
          </Text>
          <Text style={styles.previewSub}>Full size on page 1 of the agreements, small on every other form</Text>
        </View>

        {making ? (
          <>
            <Text style={styles.groupTitle} accessibilityRole="header">
              Your details
            </Text>
            {detailsRow}

            <Text style={styles.groupTitle} accessibilityRole="header">
              Design
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.designs}>
              {LETTERHEAD_TEMPLATES.map((template) => {
                const chosen = design.template === template.id;
                return (
                  <Pressable
                    key={template.id}
                    onPress={() => updateDesign({ template: template.id })}
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
            <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Colour">
              {LETTERHEAD_COLOURS.map((colour) => {
                const chosen = design.colour === colour.id;
                return (
                  <Pressable
                    key={colour.id}
                    onPress={() => updateDesign({ colour: colour.id })}
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
              Picture
            </Text>
            <PictureSettings picture={design.picture} onChange={(picture) => updateDesign({ picture })} />

            <Pressable
              onPress={() => setMore((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel="More options: logo and lettering"
              accessibilityState={{ expanded: more }}
              style={({ pressed }) => [styles.more, pressed && styles.pressed]}
            >
              <Text style={styles.moreText}>More options</Text>
              <Text style={styles.moreSub}>Logo and lettering</Text>
              <View style={more && styles.flipped}>
                <Icon name="chevronDown" size={18} color={colors.ink2} strokeWidth={2} />
              </View>
            </Pressable>
            {more && (
              <>
                <Text style={styles.subTitle}>Logo</Text>
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
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{design.logo ? "Your logo" : "No logo"}</Text>
                    <Text style={styles.rowSub}>
                      {design.logo ? "In place of your initials" : "Your initials are used"}
                    </Text>
                  </View>
                  {picking ? (
                    <Spinner size={20} accessibilityLabel="Adding the logo" />
                  ) : (
                    <View style={styles.logoActions}>
                      {design.logo && (
                        <Pressable
                          onPress={removeLogo}
                          accessibilityRole="button"
                          accessibilityLabel="Remove the logo"
                          style={styles.textButton}
                        >
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

                <Text style={styles.subTitle}>Lettering of your details</Text>
                <Segmented
                  options={LETTERING}
                  value={design.elegant ? "elegant" : "clean"}
                  onChange={(value) => updateDesign({ elegant: value === "elegant" })}
                  accessibilityLabel="Lettering of the details"
                />
              </>
            )}
          </>
        ) : (
          <>
            <View style={[styles.panel, styles.inUse]}>
              <Text style={styles.inUseLabel}>In use</Text>
              <Text style={styles.inUseTitle}>{inUse?.title}</Text>
              <Text style={styles.rowSub}>{inUseDetail(design)}</Text>
              {inUse?.href && (
                <Button
                  title="Change it"
                  variant="secondary"
                  size="compact"
                  onPress={() => router.push(inUse.href as Href)}
                  style={styles.inUseButton}
                />
              )}
              <Button
                title="Make a letterhead instead"
                onPress={() => updateDesign({ style: "make" })}
                style={styles.inUseButton}
              />
            </View>

            <Text style={styles.groupTitle} accessibilityRole="header">
              Your details
            </Text>
            {detailsRow}
          </>
        )}

        <Text style={styles.groupTitle} accessibilityRole="header">
          Other kinds of letterhead
        </Text>
        <View style={styles.panel}>
          {OTHER_KINDS.map((kind, index) => {
            const used = design.style === kind.style;
            return (
              <Pressable
                key={kind.style}
                onPress={() => (kind.href ? router.push(kind.href) : updateDesign({ style: kind.style }))}
                accessibilityRole="button"
                accessibilityLabel={`${kind.title}. ${kind.sub}${used ? ". In use" : ""}`}
                style={({ pressed }) => [styles.row, index > 0 && styles.divided, pressed && styles.pressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{kind.title}</Text>
                  <Text style={styles.rowSub}>{kind.sub}</Text>
                </View>
                {used ? (
                  <Text style={styles.used}>In use</Text>
                ) : kind.href ? (
                  <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.privacy}>
          <Icon name="lock" size={16} color={colors.ink2} strokeWidth={2} />
          <Text style={styles.privacyText}>Saved as you go, on this phone. Nothing is uploaded.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  previewArea: { alignItems: "center", paddingTop: spacing.md },
  previewNote: { marginTop: 10, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.inkBody },
  previewSub: { ...type.caption, fontFamily: fonts.regular, textAlign: "center", color: colors.ink2 },
  groupTitle: {
    ...type.status,
    marginTop: spacing.xxl,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.ink2,
  },
  subTitle: {
    marginTop: spacing.lg,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
  },
  panel: { borderRadius: radii.panel, backgroundColor: colors.surface, overflow: "hidden" },
  divided: { borderTopWidth: 1, borderTopColor: colors.hairline },
  pressed: { backgroundColor: colors.fillPressed },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { ...type.rowTitle, color: colors.ink },
  rowTitleMissing: { color: colors.brandText },
  rowSub: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  designs: { gap: 10, paddingRight: spacing.screen },
  design: {
    // 84 at 100%; as wide as the name when that is wider, so "Monogram" never breaks in the middle
    minWidth: 84,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
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
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
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
  // The words wrap under each other with a big Font size; the arrow stays at the end
  more: {
    minHeight: 56,
    marginTop: spacing.xxl,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  moreText: { ...type.rowTitle, color: colors.ink },
  moreSub: { flex: 1, minWidth: 120, ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  flipped: { transform: [{ rotate: "180deg" }] },
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
  logoActions: { flexDirection: "row" },
  textButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  textButtonText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.brandText },
  removeText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.late },
  inUse: { marginTop: spacing.xl, padding: spacing.lg },
  inUseLabel: { ...type.status, color: colors.ink2 },
  inUseTitle: { marginTop: 2, fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.ink },
  inUseButton: { marginTop: spacing.md },
  used: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: 18,
  },
  privacyText: { flexShrink: 1, ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
}));

export default LetterheadScreen;
