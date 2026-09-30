import { Image, ImageContentFit } from "expo-image";
import React, { useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Ellipse, G, Path, Rect } from "react-native-svg";
import { colors, PianoPalette, pianoPalettes } from "@/constants/theme";

const KEYS = "#F7F3EA";
const KEY_SEPARATOR = "#D2CABB";
const BLACK_KEY = "#2B2320";

// The nine gaps between the ten white keys, and the seven black keys
const SEPARATORS =
  "M18.4 40v7M23.8 40v7M29.2 40v7M34.6 40v7M40 40v7M45.4 40v7M50.8 40v7M56.2 40v7M61.6 40v7";
const BLACK_KEYS = [17.2, 22.6, 33.4, 38.8, 44.2, 55, 60.4];

/**
 * The drawing's colours for a piano. The same id always gives the same palette
 * (FNV-1a hash of the id), so a piano keeps its look between screens and visits.
 */
export const paletteFor = (id: string): PianoPalette => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return pianoPalettes[(hash >>> 0) % pianoPalettes.length];
};

/**
 * An upright piano, for a piano with no photo. It crops like a photo
 * (`slice`), so it fills a card, a thumbnail or a hero the same way.
 */
export const PianoIllustration = React.memo(function PianoIllustration({
  palette,
}: {
  palette: PianoPalette;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 160 160"
      preserveAspectRatio="xMidYMid slice"
    >
      <Rect width={160} height={160} fill={palette.wall} />
      <Rect y={112} width={160} height={48} fill={palette.floor} />
      <Ellipse
        cx={80}
        cy={115}
        rx={52}
        ry={4.5}
        fill={colors.ink}
        fillOpacity={0.14}
      />
      <G transform="translate(28 40) scale(1.3)">
        <Rect x={8} y={8} width={64} height={6} rx={2} fill={palette.dark} />
        <Rect x={11} y={14} width={58} height={22} rx={1.5} fill={palette.body} />
        <Rect x={17} y={19} width={46} height={12} rx={1} fill={palette.panel} />
        <Rect x={8} y={36} width={64} height={4} rx={1.5} fill={palette.dark} />
        <Rect x={13} y={40} width={54} height={7} fill={KEYS} />
        <Path d={SEPARATORS} stroke={KEY_SEPARATOR} strokeWidth={0.6} />
        {BLACK_KEYS.map((x) => (
          <Rect
            key={x}
            x={x}
            y={40}
            width={2.4}
            height={4.5}
            fill={BLACK_KEY}
          />
        ))}
        <Rect x={11} y={47} width={58} height={5} fill={palette.body} />
        <Rect x={11} y={47} width={5} height={11} rx={1} fill={palette.dark} />
        <Rect x={64} y={47} width={5} height={11} rx={1} fill={palette.dark} />
      </G>
    </Svg>
  );
});

export type PianoPhotoProps = {
  /** The piano's id. Picks the colours of the drawing shown when there is no photo */
  id: string;
  /** The photo. With none, or if it fails to load, the piano drawing shows instead */
  uri?: string | null;
  /** Size, corner radius and position. Corners are clipped, so a radius works */
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Read out for the photo. Leave it off when the text next to the photo says it */
  accessibilityLabel?: string;
  /** Drawn on top of the photo, such as a badge */
  children?: React.ReactNode;
  testID?: string;
};

const PianoPhoto = ({
  id,
  uri,
  style,
  contentFit = "cover",
  accessibilityLabel,
  children,
  testID,
}: PianoPhotoProps) => {
  // Remember which address failed rather than a flag, so a new photo for the
  // same piano gets its own try without an effect to reset the state
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const palette = paletteFor(id);
  const showPhoto = !!uri && uri !== failedUri;

  return (
    // The wall colour shows while a photo loads, so the frame doesn't flash white
    <View
      style={[styles.frame, { backgroundColor: palette.wall }, style]}
      testID={testID}
    >
      <View
        style={StyleSheet.absoluteFill}
        accessible={!!accessibilityLabel}
        accessibilityRole={accessibilityLabel ? "image" : undefined}
        accessibilityLabel={accessibilityLabel}
      >
        {showPhoto ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit={contentFit}
            onError={() => setFailedUri(uri)}
          />
        ) : (
          <PianoIllustration palette={palette} />
        )}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: { overflow: "hidden" },
});

export default React.memo(PianoPhoto);
