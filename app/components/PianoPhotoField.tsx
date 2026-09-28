import { icons } from "@/constants";
import { PianoFormImage } from "@/utils/pianoForm";
import { PhotoSource } from "@/utils/photo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, ViewStyle } from "react-native";

interface PianoPhotoFieldProps {
  // A photo picked on this screen, not uploaded yet
  image: PianoFormImage | null;
  // The piano's current photo, when editing
  savedPhotoUrl?: string;
  onPick: (source: PhotoSource) => void;
  onRemove: () => void;
}

const overlayButton = (position: ViewStyle): ViewStyle => ({
  position: "absolute",
  backgroundColor: "rgba(0,0,0,0.5)",
  borderRadius: 15,
  width: 32,
  height: 32,
  alignItems: "center",
  justifyContent: "center",
  ...position,
});

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

const CameraButton = ({
  left,
  onPress,
}: {
  left: number;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityLabel="Take a new photo"
    style={overlayButton({ bottom: 16, left })}
  >
    <Ionicons name="camera" size={16} color="white" />
  </TouchableOpacity>
);

/**
 * The photo part of the piano forms: the picked or saved photo with buttons
 * to replace it, or buttons to take or choose one.
 */
const PianoPhotoField: React.FC<PianoPhotoFieldProps> = ({
  image,
  savedPhotoUrl,
  onPick,
  onRemove,
}) => {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const shownUri = image?.uri ?? savedPhotoUrl;

  // A different photo gets a fresh try
  useEffect(() => {
    setFailedUri(null);
  }, [shownUri]);

  const pickFromLibrary = () => onPick("library");
  const takePhoto = () => onPick("camera");

  if (image) {
    return (
      <TouchableOpacity onPress={pickFromLibrary}>
        {failedUri === image.uri ? (
          <PhotoError message="The image may be corrupted or too small." />
        ) : (
          <Image
            style={{ height: 180 }}
            source={{ uri: image.uri }}
            resizeMode="cover"
            className="w-full h-64 rounded-2xl"
            onError={() => setFailedUri(image.uri)}
          />
        )}
        <TouchableOpacity
          onPress={onRemove}
          style={overlayButton({ top: 16, right: 16 })}
        >
          <Image
            source={icons.close}
            className="w-3 h-3 absolute"
            tintColor="white"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <CameraButton left={16} onPress={takePhoto} />
      </TouchableOpacity>
    );
  }

  if (savedPhotoUrl) {
    return (
      <TouchableOpacity onPress={pickFromLibrary}>
        {failedUri === savedPhotoUrl ? (
          <PhotoError message="The existing image may be corrupted." />
        ) : (
          <Image
            source={{ uri: savedPhotoUrl }}
            className="w-full rounded-2xl"
            resizeMode="cover"
            style={{ height: 180 }}
            onError={() => setFailedUri(savedPhotoUrl)}
          />
        )}
        <TouchableOpacity
          onPress={pickFromLibrary}
          style={overlayButton({ bottom: 16, left: 16 })}
        >
          <Image
            source={icons.pencil}
            className="w-3 h-3 absolute"
            tintColor="white"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <CameraButton left={56} onPress={takePhoto} />
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row space-x-3">
      <TouchableOpacity
        onPress={takePhoto}
        style={{ height: 60 }}
        className="flex-1 px-4 bg-black-100 rounded-2xl border-2 border-black-200 flex justify-center items-center flex-row space-x-2"
      >
        <Ionicons name="camera-outline" size={20} color="#CDCDE0" />
        <Text className="text-sm text-gray-100 font-pmedium">Take Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={pickFromLibrary}
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
};

export default PianoPhotoField;
