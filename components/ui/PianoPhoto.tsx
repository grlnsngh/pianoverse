import { Image, ImageContentFit } from "expo-image";
import React, { useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Ellipse, G, Path, Rect } from "react-native-svg";
import { fonts, PianoPalette, pianoPalettes, pianoPalettesDark, Scheme } from "@/constants/theme";
import Icon from "./Icon";
import { makeStyles, useColors, useTheme } from "@/lib/ThemeContext";

const KEYS = "#F7F3EA";
const KEY_SEPARATOR = "#D2CABB";
const BLACK_KEY = "#2B2320";
const SHADOW = "#1A1814";

// The nine gaps between the ten white keys, and the seven black keys
const SEPARATORS =
  "M18.4 40v7M23.8 40v7M29.2 40v7M34.6 40v7M40 40v7M45.4 40v7M50.8 40v7M56.2 40v7M61.6 40v7";
const BLACK_KEYS = [17.2, 22.6, 33.4, 38.8, 44.2, 55, 60.4];

/**
 * The drawing's colours for a piano. The same id always gives the same palette
 * (FNV-1a hash of the id), so a piano keeps its look between screens and visits.
 */
export const paletteFor = (id: string, scheme: Scheme = "light"): PianoPalette => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const palettes = scheme === "dark" ? pianoPalettesDark : pianoPalettes;
  return palettes[(hash >>> 0) % palettes.length];
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
        fill={SHADOW}
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
  /**
   * For a photo that is big enough to hold a button, such as the one at the top
   * of a piano's page: a photo that fails to load shows a grey "Retry" tile
   * instead of the drawing (which would look like a piano with no photo), and
   * pressing it tries again. Small photos in lists keep the drawing.
   */
  retryable?: boolean;
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
  retryable = false,
  style,
  contentFit = "cover",
  accessibilityLabel,
  children,
  testID,
}: PianoPhotoProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { scheme } = useTheme();
  // Remember which address failed rather than a flag, so a new photo for the
  // same piano gets its own try without an effect to reset the state
  const [failedUri, setFailedUri] = useState<string | null>(null);
  // Bumped by Retry, so the photo is asked for again
  const [attempt, setAttempt] = useState(0);
  const palette = paletteFor(id, scheme);
  const showPhoto = !!uri && uri !== failedUri;
  const failed = !!uri && uri === failedUri;

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
            key={attempt}
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit={contentFit}
            onError={() => setFailedUri(uri)}
          />
        ) : failed && retryable ? (
          <Pressable
            onPress={() => {
              setFailedUri(null);
              setAttempt((count) => count + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel="Photo didn't load. Retry"
            style={styles.retry}
          >
            <Icon name="refresh" size={22} color={colors.ink} strokeWidth={1.75} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : (
          <PianoIllustration palette={palette} />
        )}
      </View>
      {children}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  frame: { overflow: "hidden" },
  // The Feedback board's "Failed to load" tile
  retry: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.fillInput,
  },
  retryText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.ink },
}));

export default React.memo(PianoPhoto);
