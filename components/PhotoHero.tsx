import React, { useState } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, PianoPhoto } from "@/components/ui";
import type { IconName } from "@/components/ui";
import { colors, fonts } from "@/constants/theme";
import PhotoViewer from "./PhotoViewer";

/** The photo is this high below the status bar, as on the Detail boards */
export const HERO_HEIGHT = 340;
const BUTTON = 44;

export type PhotoHeroProps = {
  /** The piano's id: picks the drawing shown when there is no photo */
  pianoId: string;
  /** The URLs of the photos, the cover first */
  photos: string[];
  /** A sold piano's photo is washed out and marked SOLD */
  sold?: boolean;
  onBack: () => void;
  /** Left out where sharing isn't offered (a sold piano) */
  onShare?: () => void;
  onMore: () => void;
};

type RoundButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  iconSize: number;
  strokeWidth: number;
  style: object;
};

/** A white circle on the photo. 44 px, so it is easy to hit. */
const RoundButton = ({ icon, label, onPress, iconSize, strokeWidth, style }: RoundButtonProps) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [styles.round, style, pressed && styles.pressed]}
  >
    <Icon name={icon} size={iconSize} color={colors.ink} strokeWidth={strokeWidth} />
  </Pressable>
);

/**
 * The top of a piano's page: its photos edge to edge, swiped through one by
 * one with a count such as "1 / 4", with the Back, Share and ⋯ buttons on the
 * photo. Tapping a photo opens it full screen. A photo that can't load shows
 * a Retry tile. A piano with no photo shows the drawing.
 */
const PhotoHero = ({ pianoId, photos, sold = false, onBack, onShare, onMore }: PhotoHeroProps) => {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);
  const [index, setIndex] = useState(0);
  // The photo open in the full-screen viewer, if any
  const [viewing, setViewing] = useState<number | null>(null);
  const height = HERO_HEIGHT + insets.top;

  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const slide = (uri: string | undefined, position: number) => (
    <Pressable
      key={`${position}-${uri ?? "none"}`}
      onPress={uri ? () => setViewing(position) : undefined}
      disabled={!uri}
      accessibilityLabel={uri ? `Open photo ${position + 1}` : undefined}
      style={{ width, height }}
    >
      <PianoPhoto id={pianoId} uri={uri} retryable style={{ width, height }} />
    </Pressable>
  );

  return (
    <View onLayout={handleLayout} style={{ height }} testID="photo-hero">
      {photos.length > 1 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
        >
          {photos.map((uri, position) => slide(uri, position))}
        </ScrollView>
      ) : (
        slide(photos[0], 0)
      )}

      {sold && <View pointerEvents="none" style={styles.wash} testID="sold-wash" />}

      <RoundButton
        icon="chevronLeft"
        label="Back to pianos"
        onPress={onBack}
        iconSize={22}
        strokeWidth={2.2}
        style={{ left: 16, top: insets.top + 12 }}
      />
      {onShare && (
        <RoundButton
          icon="share"
          label="Share"
          onPress={onShare}
          iconSize={20}
          strokeWidth={1.9}
          style={{ right: 16 + BUTTON + 8, top: insets.top + 12 }}
        />
      )}
      <RoundButton
        icon="more"
        label="More options"
        onPress={onMore}
        iconSize={20}
        strokeWidth={1.75}
        style={{ right: 16, top: insets.top + 12 }}
      />

      {photos.length > 1 && (
        <View pointerEvents="none" style={[styles.pill, styles.count]} testID="photo-counter">
          <Text style={styles.countText}>
            {index + 1} / {photos.length}
          </Text>
        </View>
      )}
      {sold && (
        <View pointerEvents="none" style={[styles.pill, styles.soldBadge]} testID="sold-badge">
          <Text style={styles.soldText}>SOLD</Text>
        </View>
      )}

      <PhotoViewer
        photos={photos}
        startIndex={viewing ?? 0}
        visible={viewing !== null}
        onClose={() => setViewing(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  round: {
    position: "absolute",
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  pressed: { opacity: 0.9 },
  wash: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.soldWash },
  pill: { position: "absolute", bottom: 40, borderRadius: 999 },
  count: { right: 16, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: colors.photoScrim },
  countText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.white },
  soldBadge: { left: 16, paddingVertical: 3, paddingHorizontal: 12, backgroundColor: colors.ink },
  soldText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.48,
    color: colors.white,
  },
});

export default PhotoHero;
