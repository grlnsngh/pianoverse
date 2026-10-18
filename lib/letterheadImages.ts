import { Directory, File, Paths } from "expo-file-system";
import { SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { encodeImage } from "@/utils/imageEncode";
import type { LetterheadImage } from "@/utils/letterhead";

/**
 * The letterhead's images (canvas boards LetterheadMake and LetterheadUpload):
 * a logo, a picture, and the business's own letterhead. Picked from the phone's photos,
 * made a sensible size, and kept in the app's own folder; nothing is uploaded.
 * A PDF carries them as data, so the file is read again each time one is made.
 */

/**
 * What an image is for: a logo keeps its clear background (PNG); a letterhead
 * is a photo of a page (JPEG); a picture stays what it was, a photo (JPEG) or
 * a drawing with a clear background (PNG).
 */
export type LetterheadImageKind = "logo" | "picture" | "letterhead";

type Size = { width: number; format: SaveFormat; extension: string };

const PNG = { format: SaveFormat.PNG, extension: "png" };
const JPEG = { format: SaveFormat.JPEG, extension: "jpg" };

const SIZES: Record<Exclude<LetterheadImageKind, "picture">, Size> = {
  // Printed at most about 130 px wide: 600 is sharp on paper
  logo: { width: 600, ...PNG },
  // A whole A4 page at 150 dots to the inch
  letterhead: { width: 1240, ...JPEG },
};

/** A picture is printed at most about 340 px wide: 800 is sharp on paper. */
const pictureSize = (asset: ImagePicker.ImagePickerAsset): Size => {
  const png = asset.mimeType === "image/png" || /\.png$/i.test(asset.fileName ?? asset.uri);
  return { width: 800, ...(png ? PNG : JPEG) };
};

const folder = () => new Directory(Paths.document, "letterhead");

const fileOf = (image: LetterheadImage) => new File(folder(), image.file);

/**
 * Lets the person choose an image from their photos and keeps a copy for the
 * letterhead. Resolves to null if they cancel.
 *
 * @throws {Error} If the image can't be read or kept; the screen tells the person.
 */
export const pickLetterheadImage = async (kind: LetterheadImageKind): Promise<LetterheadImage | null> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const size = kind === "picture" ? pictureSize(asset) : SIZES[kind];
  const resized = await encodeImage(asset.uri, {
    width: asset.width > size.width ? size.width : undefined,
    compress: size.format === SaveFormat.PNG ? 1 : 0.85,
    format: size.format,
  });
  const directory = folder();
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  const name = `${kind}-${Date.now()}.${size.extension}`;
  const target = new File(directory, name);
  await new File(resized.uri).move(target, { overwrite: true });
  return { file: name, width: resized.width, height: resized.height };
};

/** The image's file:// address, to show it on a screen. */
export const letterheadImageUri = (image: LetterheadImage): string => fileOf(image).uri;

/** The image as a data: address for a PDF or its preview, or null when it has gone missing. */
export const letterheadImageData = async (image: LetterheadImage | null): Promise<string | null> => {
  if (!image) return null;
  try {
    const file = fileOf(image);
    if (!file.exists) return null;
    const type = image.file.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${type};base64,${await file.base64()}`;
  } catch (error) {
    console.warn("Could not read a letterhead image:", error);
    return null;
  }
};

/** Deletes an image that was replaced or removed. */
export const deleteLetterheadImage = (image: LetterheadImage | null) => {
  if (!image) return;
  try {
    const file = fileOf(image);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn("Could not delete a letterhead image:", error);
  }
};

/** Deletes every letterhead image, when the person signs out or deletes their account. */
export const clearLetterheadImages = () => {
  try {
    const directory = folder();
    if (directory.exists) directory.delete();
  } catch (error) {
    console.warn("Could not clear the letterhead images:", error);
  }
};
