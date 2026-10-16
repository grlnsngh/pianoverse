import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colourById, type LetterheadDesign } from "@/utils/letterhead";
import type { FormThumbnailKind } from "@/utils/paperForms/catalog";

/**
 * Small drawings of paper (PaperForms and Letterhead boards): a form in the
 * list of forms, the full kit, and a letterhead's top. They are pictures of
 * paper, so they stay black on white in the dark theme too, and they are
 * hidden from screen readers: the text next to them says what they are. The
 * pages themselves are shown for real (PaperPreview).
 */
const PAPER = {
  page: "#FFFFFF",
  edge: "#CFCBC2",
  ink: "#1A1814",
  faint: "#B4AEA3",
  light: "#D9D5CC",
  band: "#EFEDE8",
} as const;

const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants" as const,
};

/** A line `width` wide (a number, or a share of the row) and `height` thick. */
const Bar = ({
  width,
  height = 1,
  color = PAPER.faint,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  color?: string;
  style?: ViewStyle;
}) => <View style={[{ width, height, backgroundColor: color, borderRadius: height > 2 ? 2 : 0 }, style]} />;

/**
 * A small page with a letterhead's top (Letterhead boards): the style, and
 * for a made one its design and colour, so a row or a choice shows which it
 * is. `large` is the design chips' size.
 */
export const LetterheadThumbnail = ({
  design,
  initials,
  large = false,
  testID,
}: {
  design: LetterheadDesign;
  initials: string;
  large?: boolean;
  testID?: string;
}) => {
  const c = colourById(design.colour);
  const w = large ? 56 : 44;
  const h = large ? 78 : 62;
  const at = (n: number) => Math.round((n * w) / 56);
  let top: React.ReactNode = null;
  if (design.style === "printed") {
    top = <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: at(16), backgroundColor: PAPER.band }} />;
  } else if (design.style === "upload") {
    top = <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: at(14), backgroundColor: PAPER.faint }} />;
  } else if (design.style === "make") {
    switch (design.template) {
      case "monogram":
        top = (
          <>
            <Text
              // A drawing of a page: its letters are part of the picture, not words to read
              allowFontScaling={false}
              style={{
                position: "absolute",
                left: at(4),
                top: at(1),
                fontSize: at(19),
                lineHeight: at(22),
                color: c.tint,
                fontFamily: "serif",
              }}
            >
              {initials || "Aa"}
            </Text>
            <Bar width={at(34)} height={at(3)} color={PAPER.ink} style={{ position: "absolute", left: at(6), top: at(11) }} />
          </>
        );
        break;
      case "classic":
        top = (
          <>
            <View
              style={{
                position: "absolute",
                left: at(23),
                top: at(4),
                width: at(9),
                height: at(9),
                borderRadius: at(5),
                borderWidth: 1,
                borderColor: c.accent,
              }}
            />
            <Bar width={at(28)} height={at(3)} color={PAPER.ink} style={{ position: "absolute", left: at(14), top: at(16) }} />
            <Bar height={2} color={c.accent} style={{ position: "absolute", left: at(5), right: at(5), top: at(24) }} />
          </>
        );
        break;
      case "modern":
        top = (
          <>
            <Bar height={at(3)} color={c.accent} style={{ position: "absolute", left: 0, right: 0, top: 0 }} />
            <View
              style={{
                position: "absolute",
                left: at(5),
                top: at(8),
                width: at(10),
                height: at(10),
                borderRadius: 2,
                backgroundColor: c.pale,
              }}
            />
            <Bar width={at(20)} height={at(3)} color={PAPER.ink} style={{ position: "absolute", left: at(18), top: at(10) }} />
          </>
        );
        break;
      case "band":
        top = (
          <>
            <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: at(14), backgroundColor: c.accent }} />
            <Bar width={at(22)} height={at(3)} color={PAPER.page} style={{ position: "absolute", left: at(5), top: at(5) }} />
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: at(6), backgroundColor: c.pale }} />
          </>
        );
        break;
      default:
        top = (
          <>
            <Bar width={at(24)} height={at(3)} color={c.accent} style={{ position: "absolute", left: at(5), top: at(6) }} />
            <Bar height={1} color={c.accent} style={{ position: "absolute", left: at(5), right: at(5), top: at(14) }} />
          </>
        );
    }
  }
  return (
    <View style={[styles.lhPage, { width: w, height: h }]} testID={testID} {...hidden}>
      {top}
      {[34, 40, 46, 52].map((y, index) => (
        <View
          key={y}
          style={{
            position: "absolute",
            left: at(5),
            right: at([5, 12, 5, 18][index]),
            top: at(y),
            height: 2,
            backgroundColor: PAPER.light,
          }}
        />
      ))}
    </View>
  );
};

/** Three pages fanned out, on the full kit's card. */
export const KitThumbnail = () => (
  <View style={styles.kit} {...hidden}>
    <View style={[styles.small, styles.kitPage, styles.kitBack]} />
    <View style={[styles.small, styles.kitPage, styles.kitMiddle]} />
    <View style={[styles.small, styles.kitPage, styles.kitFront]}>
      <Bar width={20} height={3} color={PAPER.ink} />
      <Bar height={2} color={PAPER.light} style={{ marginTop: 5 }} />
      <Bar width="70%" height={2} color={PAPER.light} style={{ marginTop: 3 }} />
      <View style={styles.kitBox} />
    </View>
  </View>
);

/** The small drawing of a form in the list: a page with a table, receipts or lines. */
const FormThumbnail = ({ kind, testID }: { kind: FormThumbnailKind; testID?: string }) => (
  <View style={styles.small} testID={testID} {...hidden}>
    <Bar width={20} height={3} color={PAPER.ink} />
    {kind === "table" && (
      <View style={styles.smallTable}>
        {[0, 1, 2, 3, 4].map((line) => (
          <View key={line} style={styles.smallTableLine} />
        ))}
      </View>
    )}
    {kind === "receipt" &&
      [0, 1, 2].map((box) => (
        <View key={box} style={[styles.smallReceipt, { marginTop: box === 0 ? 5 : 2 }]} />
      ))}
    {kind === "lines" &&
      (["100%", "100%", "80%", "100%", "60%", "100%"] as const).map((width, line) => (
        <Bar key={line} width={width} height={2} color={PAPER.light} style={{ marginTop: line === 0 ? 6 : 4 }} />
      ))}
  </View>
);

const styles = StyleSheet.create({
  small: {
    width: 44,
    height: 62,
    flexShrink: 0,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PAPER.edge,
    backgroundColor: PAPER.page,
    paddingVertical: 6,
    paddingHorizontal: 5,
  },
  smallTable: {
    marginTop: 6,
    height: 38,
    borderWidth: 1,
    borderColor: PAPER.light,
    justifyContent: "space-evenly",
  },
  smallTableLine: { height: 1, backgroundColor: PAPER.light },
  smallReceipt: { height: 12, borderWidth: 1, borderColor: PAPER.light },
  lhPage: {
    flexShrink: 0,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: PAPER.edge,
    backgroundColor: PAPER.page,
    overflow: "hidden",
  },
  kit: { width: 76, height: 72 },
  kitPage: { position: "absolute" },
  kitBack: { left: 24, top: 0, transform: [{ rotate: "8deg" }] },
  kitMiddle: { left: 12, top: 4, transform: [{ rotate: "-4deg" }] },
  kitFront: { left: 4, top: 8 },
  kitBox: { height: 22, marginTop: 5, borderWidth: 1, borderColor: PAPER.light, borderRadius: 1 },
});

export default React.memo(FormThumbnail);
