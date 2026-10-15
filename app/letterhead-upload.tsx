import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackBar from "@/components/BackBar";
import PaperPreview from "@/components/PaperPreview";
import { Button, Segmented, Slider } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { deleteLetterheadImage, pickLetterheadImage } from "@/lib/letterheadImages";
import useLetterhead from "@/lib/useLetterhead";
import usePreviewHtml, { type PageMaker } from "@/lib/usePreviewHtml";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { mmToPx, SPACE_LIMITS, type LetterheadDesign } from "@/utils/letterhead";
import { agreementPages } from "@/utils/paperForms/agreements";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/utils/paperForms/html";
import { showToast } from "@/utils/toast";

const PREVIEW_WIDTH = 250;

const agreementFirstPage: PageMaker = (details, design, assets) => agreementPages("hotel", details, design, assets)[0];

const KINDS = [
  { value: "page", label: "Whole page" },
  { value: "strip", label: "Top strip only" },
] as const;

const STEPS = [
  "In Canva, open your letterhead. Remove the page’s text so only the letterhead is left.",
  "Share, Download, PNG. The whole A4 page, or just the top strip.",
  "Choose it here, then set where your text may go.",
];

/**
 * Your own letterhead (LetterheadUpload board), opened from the Letterhead
 * screen: the business's letterhead as an image from their photos (made in
 * Canva, or a scan), the whole page or its top strip, and where the writing
 * may go, shown on the real page.
 */
const LetterheadUpload = () => {
  const colors = useColors();
  const styles = useStyles();
  const { details, design, updateDesign } = useLetterhead();
  const [picking, setPicking] = useState(false);
  const { upload } = design;
  const uploaded = useMemo<LetterheadDesign>(() => ({ ...design, style: "upload" }), [design]);
  const html = usePreviewHtml(uploaded, details, PREVIEW_WIDTH, agreementFirstPage);

  const choose = async () => {
    setPicking(true);
    try {
      const image = await pickLetterheadImage("letterhead");
      if (image) {
        deleteLetterheadImage(upload.image);
        updateDesign({ style: "upload", upload: { ...upload, image } });
      }
    } catch (error) {
      console.warn("Could not add the letterhead image:", error);
      showToast("Couldn’t add that image. Try another.", { variant: "error" });
    } finally {
      setPicking(false);
    }
  };

  const setSpace = (patch: Partial<LetterheadDesign["upload"]>) =>
    updateDesign({ style: "upload", upload: { ...upload, ...patch } });

  // Where the writing goes, drawn over the page
  const scale = PREVIEW_WIDTH / PAGE_WIDTH;
  const top = Math.round(mmToPx(upload.top) * scale);
  const bottom = Math.round(mmToPx(upload.kind === "page" ? upload.bottom : 10) * scale);
  const clearArea = (
    <View
      style={{
        position: "absolute",
        left: Math.round(40 * scale),
        right: Math.round(40 * scale),
        top,
        height: Math.max(0, Math.round(PAGE_HEIGHT * scale) - top - bottom),
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.brand,
        borderRadius: 3,
      }}
    />
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <BackBar title="Your own letterhead" fallback="/letterhead" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Use the letterhead you already have</Text>
          {STEPS.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {upload.image ? (
          <>
            <View style={styles.previewArea}>
              <PaperPreview
                html={html}
                width={PREVIEW_WIDTH}
                overlay={clearArea}
                accessibilityLabel="Rental agreement, page 1, on your letterhead"
              />
              <Text style={styles.previewNote}>Your writing goes inside the orange box</Text>
            </View>

            <Segmented
              options={KINDS}
              value={upload.kind}
              onChange={(kind) => setSpace({ kind })}
              accessibilityLabel="What is in the image"
              style={styles.section}
            />

            <View style={[styles.card, styles.sliders]}>
              <View style={styles.sliderHead}>
                <Text style={styles.sliderTitle}>Space at the top</Text>
                <Text style={styles.sliderValue}>{upload.top} mm</Text>
              </View>
              <Slider
                value={upload.top}
                min={SPACE_LIMITS.upload.top[0]}
                max={SPACE_LIMITS.upload.top[1]}
                onChange={(value) => setSpace({ top: value })}
                accessibilityLabel="Space at the top"
                unit="millimetres"
              />
              {upload.kind === "page" && (
                <>
                  <View style={[styles.sliderHead, styles.sliderGap]}>
                    <Text style={styles.sliderTitle}>Space at the bottom</Text>
                    <Text style={styles.sliderValue}>{upload.bottom} mm</Text>
                  </View>
                  <Slider
                    value={upload.bottom}
                    min={SPACE_LIMITS.upload.bottom[0]}
                    max={SPACE_LIMITS.upload.bottom[1]}
                    onChange={(value) => setSpace({ bottom: value })}
                    accessibilityLabel="Space at the bottom"
                    unit="millimetres"
                  />
                </>
              )}
            </View>

            <Button
              title="Choose another image"
              variant="secondary"
              size="compact"
              loading={picking}
              loadingTitle="Choosing"
              onPress={choose}
              style={styles.section}
            />
          </>
        ) : (
          <Button title="Choose image" loading={picking} loadingTitle="Choosing" onPress={choose} style={styles.section} />
        )}

        <Text style={styles.note}>
          PNG or JPG. Kept on this phone. Long agreements go on to a third page, so nothing is cut off.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  card: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radii.card, backgroundColor: colors.surface },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.ink },
  step: { flexDirection: "row", gap: spacing.md, marginTop: 10 },
  stepNumber: {
    minWidth: 24,
    minHeight: 24,
    paddingHorizontal: 4,
    // Beside a step that takes several lines it stays a circle at the top, not an oval
    alignSelf: "flex-start",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fill,
  },
  stepNumberText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  stepText: { flex: 1, ...type.secondary, color: colors.inkBody },
  previewArea: { alignItems: "center", paddingTop: spacing.lg },
  previewNote: { marginTop: 10, ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  section: { marginTop: spacing.lg },
  sliders: { marginTop: spacing.lg },
  sliderHead: { flexDirection: "row", justifyContent: "space-between" },
  sliderGap: { marginTop: spacing.md },
  sliderTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  sliderValue: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.inkBody, fontVariant: ["tabular-nums"] },
  note: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    ...type.caption,
    fontFamily: fonts.regular,
    textAlign: "center",
    color: colors.ink2,
  },
}));

export default LetterheadUpload;
