import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { prepareImageForUpload } from "@/utils/image";

export type PhotoSource = "camera" | "library";

// Smaller crops look broken on the piano cards
const MIN_SIZE = 50;

/** What differs between the kinds of photo the app takes. */
interface PhotoKind {
  /** The shape of the crop the person makes */
  aspect: [number, number];
  /** What the alert says when camera access is refused and the screen has no explanation of its own */
  cameraDeniedMessage: string;
  /** How wide the upload may be, and how big it should stay, when it has to be made smaller */
  maxWidth?: number;
  targetSize?: number;
}

const PIANO: PhotoKind = {
  aspect: [4, 3],
  cameraDeniedMessage:
    "Allow Pianoverse to use the camera in your phone's settings to take photos of pianos.",
};

// A circle a few hundred pixels across is plenty: it is drawn 64 to 112 points wide
const PROFILE: PhotoKind = {
  aspect: [1, 1],
  cameraDeniedMessage:
    "Allow Pianoverse to use the camera in your phone's settings to take a profile photo.",
  maxWidth: 512,
  targetSize: 150 * 1024,
};

const pickPhoto = async (
  source: PhotoSource,
  kind: PhotoKind,
  onCameraDenied?: () => void
) => {
  if (source === "camera") {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      if (onCameraDenied) {
        onCameraDenied();
      } else {
        Alert.alert("Camera Access Needed", kind.cameraDeniedMessage);
      }
      return null;
    }
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: kind.aspect,
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

  return prepareImageForUpload(asset, kind);
};

/**
 * Lets the user take a photo or choose one from their library, cropped to
 * 4:3, and prepares it for upload. Resolves to null if they cancel, refuse
 * camera access or pick something too small (they're told why). When camera
 * access is refused, `onCameraDenied` is called so the screen can show its own
 * explanation; without it the system alert is used.
 */
export const pickPianoPhoto = (source: PhotoSource, onCameraDenied?: () => void) =>
  pickPhoto(source, PIANO, onCameraDenied);

/**
 * The same for a profile picture: cropped square, and made small for upload.
 */
export const pickProfilePhoto = (source: PhotoSource, onCameraDenied?: () => void) =>
  pickPhoto(source, PROFILE, onCameraDenied);
