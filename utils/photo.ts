import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { prepareImageForUpload } from "@/utils/image";

export type PhotoSource = "camera" | "library";

// Smaller crops look broken on the piano cards
const MIN_SIZE = 50;

/**
 * Lets the user take a photo or choose one from their library, cropped to
 * 4:3, and prepares it for upload. Resolves to null if they cancel, refuse
 * camera access or pick something too small (they're told why).
 */
export const pickPianoPhoto = async (source: PhotoSource) => {
  if (source === "camera") {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Camera Access Needed",
        "Allow Pianoverse to use the camera in your phone's settings to take photos of pianos."
      );
      return null;
    }
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (asset.width < MIN_SIZE || asset.height < MIN_SIZE) {
    Alert.alert(
      "Image Too Small",
      `The cropped image is too small (${asset.width}x${asset.height}). Please select a larger area or choose a different image. Minimum size: ${MIN_SIZE}x${MIN_SIZE} pixels.`
    );
    return null;
  }

  return prepareImageForUpload(asset);
};
