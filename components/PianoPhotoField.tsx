import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import CameraDeniedSheet from "@/components/CameraDeniedSheet";
import { Icon, PianoPhoto, Sheet } from "@/components/ui";
import { colors, fonts, radii, spacing } from "@/constants/theme";
import { PhotoSource } from "@/utils/photo";
import { MAX_PHOTOS } from "@/utils/photos";
import { PianoFormPhoto, photoUri } from "@/utils/pianoForm";

interface PianoPhotoFieldProps {
  // The piano's photos, saved or picked on this screen; the first is the cover
  photos: PianoFormPhoto[];
  // Says "camera-denied" when the camera was refused
  onPick: (source: PhotoSource) => unknown;
  onRemove: (index: number) => void;
  onMakeCover: (index: number) => void;
}

const TILE = 96;

/**
 * The photos part of the piano forms (Add1Basics board): an Add tile, then a
 * square for every photo, the first marked as the cover. Tap a photo to make
 * it the cover, or its × to take it out. Add asks whether to use the camera or
 * the gallery; if the camera is refused, a sheet says how to allow it.
 */
const PianoPhotoField: React.FC<PianoPhotoFieldProps> = ({
  photos,
  onPick,
  onRemove,
  onMakeCover,
}) => {
  const [choosing, setChoosing] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);

  const pick = async (source: PhotoSource) => {
    setChoosing(false);
    if ((await onPick(source)) === "camera-denied") setCameraDenied(true);
  };

  return (
    <View>
      {/* Runs to the edges of the screen, so photos slide out from under them */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
        keyboardShouldPersistTaps="handled"
      >
        {photos.length < MAX_PHOTOS && (
          <Pressable
            onPress={() => setChoosing(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a photo"
            style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
          >
            <Icon name="camera" size={24} color={colors.ink} />
            <Text style={styles.addLabel}>Add</Text>
          </Pressable>
        )}

        {photos.map((photo, index) => {
          const uri = photoUri(photo);
          return (
            <View key={`${index}-${uri}`}>
              <Pressable
                onPress={() => onMakeCover(index)}
                disabled={index === 0}
                accessibilityRole="button"
                accessibilityLabel={
                  index === 0 ? "Cover photo" : `Make photo ${index + 1} the cover`
                }
              >
                <PianoPhoto id={uri} uri={uri} style={styles.tile}>
                  {index === 0 && (
                    <View style={styles.cover}>
                      <Text style={styles.coverLabel}>Cover</Text>
                    </View>
                  )}
                </PianoPhoto>
              </Pressable>
              <Pressable
                onPress={() => onRemove(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
                hitSlop={10}
                style={styles.remove}
              >
                <Icon name="close" size={12} color={colors.white} strokeWidth={2.6} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Text style={styles.caption}>
        Up to {MAX_PHOTOS} photos. The first one is the cover.
      </Text>

      <Sheet
        visible={choosing}
        onClose={() => setChoosing(false)}
        title="Add a photo"
        tone="white"
      >
        <View>
          {[
            { label: "Take a photo", source: "camera" as const },
            { label: "Choose from gallery", source: "library" as const },
          ].map((option) => (
            <Pressable
              key={option.source}
              onPress={() => pick(option.source)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      <CameraDeniedSheet
        visible={cameraDenied}
        onClose={() => setCameraDenied(false)}
        onChooseFromGallery={() => {
          setCameraDenied(false);
          pick("library");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Bleeds out of the screen's 20 px margins, then pads itself the same
  strip: { marginHorizontal: -spacing.screen, marginTop: -6 },
  stripContent: {
    paddingHorizontal: spacing.screen,
    // The remove buttons sit half over the corner of a photo
    paddingTop: 6,
    paddingRight: spacing.screen + 6,
    gap: 10,
  },
  add: {
    width: TILE,
    height: TILE,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    backgroundColor: colors.fill,
  },
  addPressed: { backgroundColor: colors.fillPressed },
  addLabel: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },
  tile: { width: TILE, height: TILE, borderRadius: 14 },
  cover: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    backgroundColor: colors.white,
  },
  coverLabel: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 18, color: colors.ink },
  remove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.photoScrim,
  },
  caption: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink2,
  },
  option: {
    height: 52,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  optionPressed: { backgroundColor: colors.grouped },
  optionLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
});

export default PianoPhotoField;
