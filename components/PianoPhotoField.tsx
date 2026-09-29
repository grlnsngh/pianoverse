import { icons } from "@/constants";
import { MAX_PHOTOS } from "@/utils/photos";
import { PhotoSource } from "@/utils/photo";
import { PianoFormPhoto, photoUri } from "@/utils/pianoForm";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface PianoPhotoFieldProps {
  // The piano's photos, saved or picked on this screen; the first is the cover
  photos: PianoFormPhoto[];
  onPick: (source: PhotoSource) => void;
  onRemove: (index: number) => void;
  onMakeCover: (index: number) => void;
}

const THUMBNAIL_SIZE = 64;

const removeBadge: ViewStyle = {
  position: "absolute",
  top: -6,
  right: -6,
  backgroundColor: "rgba(0,0,0,0.8)",
  borderRadius: 11,
  width: 22,
  height: 22,
  alignItems: "center",
  justifyContent: "center",
};

const PhotoError = ({ message }: { message: string }) => (
  <View
    className="w-full rounded-2xl bg-black-100 items-center justify-center"
    style={{ height: 180 }}
  >
    <Text className="text-gray-100 font-pmedium">Failed to load image</Text>
    <Text className="text-gray-100 text-sm mt-2 text-center px-4">
      {message}
    </Text>
  </View>
);

/**
 * The photos part of the piano forms: the cover, a strip with every photo
 * (tap one to make it the cover, or remove it) and buttons to take or choose
 * another photo, up to the limit.
 */
const PianoPhotoField: React.FC<PianoPhotoFieldProps> = ({
  photos,
  onPick,
  onRemove,
  onMakeCover,
}) => {
  // The photos that failed to load; a different photo gets a fresh try
  const [failedUris, setFailedUris] = useState<string[]>([]);
  const markFailed = (uri: string) =>
    setFailedUris((current) => (current.includes(uri) ? current : [...current, uri]));

  const addButtons = (
    <View className="flex-row space-x-3">
      <TouchableOpacity
        onPress={() => onPick("camera")}
        style={{ height: 60 }}
        className="flex-1 px-4 bg-black-100 rounded-2xl border-2 border-black-200 flex justify-center items-center flex-row space-x-2"
      >
        <Ionicons name="camera-outline" size={20} color="#CDCDE0" />
        <Text className="text-sm text-gray-100 font-pmedium">Take Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onPick("library")}
        style={{ height: 60 }}
        className="flex-1 px-4 bg-black-100 rounded-2xl border-2 border-black-200 flex justify-center items-center flex-row space-x-2"
      >
        <Image
          source={icons.upload}
          resizeMode="contain"
          alt="upload"
          className="w-5 h-5"
        />
        <Text className="text-sm text-gray-100 font-pmedium">
          Choose a file
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (photos.length === 0) return addButtons;

  const cover = photoUri(photos[0]);

  return (
    <View className="space-y-3">
      {failedUris.includes(cover) ? (
        <PhotoError message="The image may be corrupted or too small." />
      ) : (
        <Image
          source={{ uri: cover }}
          className="w-full rounded-2xl"
          resizeMode="cover"
          style={{ height: 180 }}
          onError={() => markFailed(cover)}
        />
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingRight: 8 }}
      >
        <View className="flex-row space-x-3">
          {photos.map((photo, index) => {
            const uri = photoUri(photo);
            return (
              <View key={`${index}-${uri}`}>
                <TouchableOpacity
                  onPress={() => onMakeCover(index)}
                  disabled={index === 0}
                  accessibilityLabel={
                    index === 0 ? "Cover photo" : `Make photo ${index + 1} the cover`
                  }
                >
                  <Image
                    source={{ uri }}
                    resizeMode="cover"
                    className="rounded-xl bg-black-100"
                    style={{
                      width: THUMBNAIL_SIZE,
                      height: THUMBNAIL_SIZE,
                      borderWidth: index === 0 ? 2 : 0,
                      borderColor: "#FF9C01",
                    }}
                  />
                  {index === 0 && (
                    <View className="absolute bottom-1 left-1 right-1 rounded-md bg-black/70 items-center">
                      <Text className="text-secondary text-xs font-pmedium">
                        Cover
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onRemove(index)}
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  style={removeBadge}
                >
                  <Image
                    source={icons.close}
                    className="w-2 h-2"
                    tintColor="white"
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Text className="text-xs text-gray-100 font-pregular">
        {photos.length} of {MAX_PHOTOS} photos
        {photos.length > 1 ? " · Tap a photo to make it the cover" : ""}
      </Text>

      {photos.length < MAX_PHOTOS && addButtons}
    </View>
  );
};

export default PianoPhotoField;
