import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { fonts } from "@/constants/theme";
import { hasContact, QUIET_ZONE, qrMatrix, qrPath, type LabelContent, type LabelSizeId } from "@/utils/qrLabels";

// The label as it is printed (utils/qrLabels.ts), drawn on the screen. It is a
// drawing of paper, so it is the same size whatever the phone's Font size, and
// it is white and black in the dark theme too.
const PAPER = "#FFFFFF";
const INK = "#1A1814";
const QUIET = "#5C574F";
const EDGE = "#C9C4B9";

/** A label's size in dp, from its size in mm at 96 to the inch, and its code's. */
const SIZES = {
  large: { width: 240, height: 128, code: 100 },
  small: { width: 144, height: 80, code: 66 },
} as const;

export type LabelPreviewProps = {
  label: LabelContent;
  size: LabelSizeId;
  testID?: string;
};

/** One label, with a dashed edge like the sheet's cut line. */
const LabelPreview = ({ label, size, testID }: LabelPreviewProps) => {
  const small = size === "small";
  const { width, height, code } = SIZES[size];
  const { path, side } = useMemo(() => {
    const matrix = qrMatrix(label.link);
    return { path: qrPath(matrix), side: matrix.length + QUIET_ZONE * 2 };
  }, [label.link]);
  const contact = hasContact(label);
  const smallLine = label.phone || label.business;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={[`Label for ${label.title}`, label.line, contact ? `If found, call ${[label.business, label.phone].filter(Boolean).join(", ")}` : ""]
        .filter(Boolean)
        .join(". ")}
      style={{
        width,
        height,
        flexDirection: "row",
        alignItems: "center",
        gap: small ? 5 : 8,
        paddingVertical: small ? 4 : 6,
        paddingHorizontal: small ? 5 : 8,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: EDGE,
        backgroundColor: PAPER,
        overflow: "hidden",
      }}
    >
      <Svg width={code} height={code} viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${side} ${side}`}>
        <Rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={side} height={side} fill={PAPER} />
        <Path d={path} fill="#000000" />
      </Svg>
      <View style={{ flex: 1, minWidth: 0, justifyContent: "center", gap: small ? 2 : 1 }}>
        <Text
          allowFontScaling={false}
          numberOfLines={2}
          style={{ fontFamily: fonts.bold, fontSize: small ? 9 : 13, lineHeight: small ? 11 : 16, color: INK }}
        >
          {label.title}
        </Text>
        {!small && !!label.line && (
          <Text allowFontScaling={false} numberOfLines={2} style={{ fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: QUIET }}>
            {label.line}
          </Text>
        )}
        {contact && !small && <View style={{ height: 1, marginTop: 5, marginBottom: 4, backgroundColor: "#D9D5CC" }} />}
        {contact && (
          <Text allowFontScaling={false} style={{ fontFamily: fonts.regular, fontSize: small ? 7.5 : 8.5, lineHeight: small ? 10 : 11, color: QUIET }}>
            If found, call
          </Text>
        )}
        {contact && !small && !!label.business && (
          <Text allowFontScaling={false} numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 9.5, lineHeight: 12, color: INK }}>
            {label.business}
          </Text>
        )}
        {contact && !small && !!label.phone && (
          <Text allowFontScaling={false} numberOfLines={1} style={{ fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 13, color: INK }}>
            {label.phone}
          </Text>
        )}
        {contact && small && (
          <Text allowFontScaling={false} numberOfLines={1} style={{ fontFamily: fonts.regular, fontSize: 7.5, lineHeight: 10, color: INK }}>
            {smallLine}
          </Text>
        )}
      </View>
    </View>
  );
};

export default React.memo(LabelPreview);
