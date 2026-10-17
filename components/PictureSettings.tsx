import { Image } from "expo-image";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, Segmented, Slider, Spinner } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { deleteLetterheadImage, letterheadImageUri, pickLetterheadImage } from "@/lib/letterheadImages";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import {
  BEHIND_STRENGTH,
  PICTURE_LIMITS,
  type LetterheadPicture,
  type PicturePlace,
  type PictureSource,
} from "@/utils/letterhead";
import { LETTERHEAD_PIANO } from "@/utils/paperForms/letterheadPiano";
import { showToast } from "@/utils/toast";

const PLACES = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
  { value: "behind", label: "Behind text" },
] as const;

const SOURCES: { source: PictureSource; title: string; hint: string }[] = [
  { source: "piano", title: "Grand piano", hint: "A grand piano in colour" },
  { source: "own", title: "My picture", hint: "A photo or a logo from your phone" },
  { source: "none", title: "None", hint: "No picture" },
];

type PictureSettingsProps = {
  picture: LetterheadPicture;
  onChange: (picture: LetterheadPicture) => void;
};

/**
 * The picture of a made letterhead (Batch 47), on the Letterhead screen: the
 * grand piano that comes with the app, the person's own picture or none, as
 * three tiles side by side (they wrap with a big Font size); where it goes
 * (beside the letterhead at the right or the left, or faint behind the
 * writing); how big; and how strongly it prints. Each change shows at once on
 * the page above.
 */
const PictureSettings = ({ picture, onChange }: PictureSettingsProps) => {
  const colors = useColors();
  const styles = useStyles();
  const [picking, setPicking] = useState(false);
  const shown = picture.source === "piano" || (picture.source === "own" && !!picture.image);

  const set = (patch: Partial<LetterheadPicture>) => onChange({ ...picture, ...patch });

  const chooseOwn = async () => {
    setPicking(true);
    try {
      const image = await pickLetterheadImage("picture");
      if (image) {
        deleteLetterheadImage(picture.image);
        set({ source: "own", image });
      }
    } catch (error) {
      console.warn("Could not add the picture:", error);
      showToast("Couldn’t add that picture. Try another.", { variant: "error" });
    } finally {
      setPicking(false);
    }
  };

  const choose = (source: PictureSource) => {
    // Their own picture is chosen from their photos the first time
    if (source === "own" && !picture.image) {
      void chooseOwn();
      return;
    }
    set({ source });
  };

  // Behind the writing it starts faint, and beside the letterhead at full strength
  const place = (next: PicturePlace) =>
    set({
      place: next,
      strength:
        next === "behind" && picture.place !== "behind"
          ? BEHIND_STRENGTH
          : next !== "behind" && picture.place === "behind"
            ? 100
            : picture.strength,
    });

  return (
    <>
      <View style={styles.tiles} accessibilityRole="radiogroup" accessibilityLabel="Picture">
        {SOURCES.map((option) => {
          const chosen = picture.source === option.source;
          const busy = option.source === "own" && picking;
          return (
            <Pressable
              key={option.source}
              onPress={() => choose(option.source)}
              disabled={picking}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen, busy }}
              accessibilityLabel={`${option.title}. ${option.hint}`}
              style={({ pressed }) => [styles.tile, chosen && styles.tileOn, pressed && styles.pressed]}
            >
              <View style={styles.thumb}>
                {option.source === "piano" ? (
                  <Image source={{ uri: LETTERHEAD_PIANO.uri }} style={styles.thumbImage} contentFit="contain" />
                ) : option.source === "own" && picture.image ? (
                  <Image source={{ uri: letterheadImageUri(picture.image) }} style={styles.thumbImage} contentFit="contain" />
                ) : busy ? (
                  <Spinner size={18} decorative />
                ) : (
                  <Icon name={option.source === "own" ? "image" : "close"} size={22} color={colors.ink2} strokeWidth={1.9} />
                )}
              </View>
              <Text style={[styles.tileName, chosen && styles.tileNameOn]}>{option.title}</Text>
            </Pressable>
          );
        })}
      </View>
      {picture.source === "own" && picture.image && (
        <Pressable
          onPress={chooseOwn}
          disabled={picking}
          accessibilityRole="button"
          accessibilityLabel="Change your picture"
          style={styles.change}
        >
          {picking ? (
            <Spinner size={18} accessibilityLabel="Choosing a picture" />
          ) : (
            <Text style={styles.changeText}>Change my picture</Text>
          )}
        </Pressable>
      )}

      {shown && (
        <>
          <Text style={styles.label}>Where it goes</Text>
          <Segmented options={PLACES} value={picture.place} onChange={place} accessibilityLabel="Where the picture goes" />

          <View style={styles.sliders}>
            <View style={styles.sliderHead}>
              <Text style={styles.sliderTitle}>Size</Text>
              <Text style={styles.sliderValue}>{picture.size}%</Text>
            </View>
            <Slider
              value={picture.size}
              min={PICTURE_LIMITS.size[0]}
              max={PICTURE_LIMITS.size[1]}
              step={5}
              onChange={(size) => set({ size })}
              accessibilityLabel="Size of the picture"
              unit="per cent"
            />
            <View style={[styles.sliderHead, styles.sliderGap]}>
              <Text style={styles.sliderTitle}>Visibility</Text>
              <Text style={styles.sliderValue}>{picture.strength}%</Text>
            </View>
            <Slider
              value={picture.strength}
              min={PICTURE_LIMITS.strength[0]}
              max={PICTURE_LIMITS.strength[1]}
              step={5}
              onChange={(strength) => set({ strength })}
              accessibilityLabel="How strongly the picture prints"
              unit="per cent"
            />
          </View>
          <Text style={styles.footer}>
            {picture.place === "behind"
              ? "Behind the writing it prints faint, so the words stay easy to read. Lower the visibility to make it paler."
              : "Big on page 1 of the agreements, beside your letterhead. Every other form gets a small one."}
          </Text>
        </>
      )}
    </>
  );
};

const useStyles = makeStyles((colors) => ({
  // Three side by side, as wide as each other; with a big Font size they wrap
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: 90,
    alignItems: "center",
    gap: 6,
    paddingTop: spacing.sm,
    paddingBottom: 10,
    paddingHorizontal: 6,
    borderRadius: radii.control,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.surface,
  },
  tileOn: { borderColor: colors.ink },
  pressed: { backgroundColor: colors.fillPressed },
  // White like the paper, whatever the theme: the picture is shown as it prints
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.input,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
  },
  thumbImage: { width: 50, height: 50 },
  tileName: { ...type.caption, textAlign: "center", color: colors.ink },
  tileNameOn: { fontFamily: fonts.bold },
  change: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: spacing.lg },
  changeText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.brandText },
  label: {
    marginTop: spacing.lg,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
  },
  sliders: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radii.card, backgroundColor: colors.surface },
  // A big Font size puts the value under its name rather than squeezing them
  sliderHead: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", columnGap: spacing.md },
  sliderGap: { marginTop: spacing.md },
  sliderTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  sliderValue: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.inkBody, fontVariant: ["tabular-nums"] },
  footer: {
    ...type.caption,
    fontFamily: fonts.regular,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    color: colors.ink2,
  },
}));

export default PictureSettings;
