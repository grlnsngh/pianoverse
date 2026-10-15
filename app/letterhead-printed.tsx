import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackBar from "@/components/BackBar";
import PaperPreview from "@/components/PaperPreview";
import { Button, Icon, Slider } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { saveTestPage } from "@/lib/paperPdf";
import useLetterhead from "@/lib/useLetterhead";
import usePaperPdf from "@/lib/usePaperPdf";
import usePreviewHtml, { type PageMaker } from "@/lib/usePreviewHtml";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { mmToPx, SPACE_LIMITS, type LetterheadDesign } from "@/utils/letterhead";
import { agreementPages } from "@/utils/paperForms/agreements";
import { PAGE_WIDTH } from "@/utils/paperForms/html";

const PREVIEW_WIDTH = 250;

const agreementFirstPage: PageMaker = (details, design, assets) => agreementPages("hotel", details, design, assets)[0];

/**
 * My printed paper (LetterheadPrinted board), opened from the Letterhead
 * screen: for a pad that already has the letterhead printed on it. The top
 * and bottom are left empty, as much as the sliders say; the real page shows
 * them hatched. A test page prints the agreement's first page to hold over the pad.
 */
const LetterheadPrinted = () => {
  const colors = useColors();
  const styles = useStyles();
  const { details, design, updateDesign } = useLetterhead();
  const { printed } = design;
  const onPad = useMemo<LetterheadDesign>(() => ({ ...design, style: "printed" }), [design]);
  const html = usePreviewHtml(onPad, details, PREVIEW_WIDTH, agreementFirstPage);
  const test = usePaperPdf(() => saveTestPage(details, onPad), "letterhead_test");

  const setSpace = (patch: Partial<LetterheadDesign["printed"]>) =>
    updateDesign({ style: "printed", printed: { ...printed, ...patch } });

  const scale = PREVIEW_WIDTH / PAGE_WIDTH;
  const hatch = { position: "absolute" as const, left: 0, right: 0, backgroundColor: colors.fill, borderColor: colors.chevron };
  const bands = (
    <>
      <View style={[hatch, { top: 0, height: Math.round(mmToPx(printed.top) * scale), borderBottomWidth: 1, borderStyle: "dashed" }]} />
      <View style={[hatch, { bottom: 0, height: Math.round(mmToPx(printed.bottom) * scale), borderTopWidth: 1, borderStyle: "dashed" }]} />
    </>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <BackBar title="My printed paper" fallback="/letterhead" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          For your own letterhead pad: nothing is printed in the grey areas, so your pad’s letterhead shows there.
        </Text>

        <View style={styles.previewArea}>
          <PaperPreview
            html={html}
            width={PREVIEW_WIDTH}
            overlay={bands}
            accessibilityLabel="Rental agreement, page 1, with space left for your pad"
          />
        </View>

        <View style={[styles.card, styles.section]}>
          <View style={styles.sliderHead}>
            <Text style={styles.sliderTitle}>Empty at the top</Text>
            <Text style={styles.sliderValue}>{printed.top} mm</Text>
          </View>
          <Slider
            value={printed.top}
            min={SPACE_LIMITS.printed.top[0]}
            max={SPACE_LIMITS.printed.top[1]}
            onChange={(value) => setSpace({ top: value })}
            accessibilityLabel="Empty space at the top"
            unit="millimetres"
          />
          <View style={[styles.sliderHead, styles.sliderGap]}>
            <Text style={styles.sliderTitle}>Empty at the bottom</Text>
            <Text style={styles.sliderValue}>{printed.bottom} mm</Text>
          </View>
          <Slider
            value={printed.bottom}
            min={SPACE_LIMITS.printed.bottom[0]}
            max={SPACE_LIMITS.printed.bottom[1]}
            onChange={(value) => setSpace({ bottom: value })}
            accessibilityLabel="Empty space at the bottom"
            unit="millimetres"
          />
        </View>

        <View style={[styles.card, styles.tip]}>
          <Icon name="printer" size={24} color={colors.ink} />
          <View style={styles.tipText}>
            <Text style={styles.sliderTitle}>Check it once</Text>
            <Text style={styles.tipBody}>
              Print a test page on plain paper and hold it over your pad. If the writing runs into the letterhead, move the
              sliders.
            </Text>
          </View>
        </View>

        <Button
          title="Print a test page"
          variant="secondary"
          size="compact"
          loading={test.busy === "print"}
          loadingTitle="Making the page"
          onPress={test.print}
          style={styles.section}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  lead: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: colors.inkBody,
  },
  previewArea: { alignItems: "center", paddingTop: spacing.lg },
  card: { padding: spacing.lg, borderRadius: radii.card, backgroundColor: colors.surface },
  section: { marginTop: spacing.lg },
  sliderHead: { flexDirection: "row", justifyContent: "space-between" },
  sliderGap: { marginTop: spacing.md },
  sliderTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  sliderValue: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.inkBody, fontVariant: ["tabular-nums"] },
  tip: { flexDirection: "row", gap: 14, marginTop: spacing.lg },
  tipText: { flex: 1 },
  tipBody: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
}));

export default LetterheadPrinted;
