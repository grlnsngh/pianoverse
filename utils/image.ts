import * as ImageManipulator from "expo-image-manipulator";

// Photos are uploaded at most this wide and, where possible, this big, unless
// the caller asks for something smaller (a profile picture does)
const MAX_WIDTH = 1600;
const TARGET_SIZE = 500 * 1024;

export interface UploadLimits {
  maxWidth?: number;
  targetSize?: number;
}

const getFileSize = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.size;
};

/**
 * Shrinks a picked photo before upload. Images up to 500 KB are kept as
 * they are. Larger ones are scaled down to 1600px wide and saved as JPEG in
 * one pass, with one stronger pass only if that is still too big. (This used
 * to re-encode up to ten times at decreasing quality.) `limits` can ask for a
 * narrower and smaller result.
 */
export const prepareImageForUpload = async <
  T extends { uri: string; width: number; height: number }
>(
  asset: T,
  limits: UploadLimits = {}
): Promise<T & { fileSize: number }> => {
  const { maxWidth = MAX_WIDTH, targetSize = TARGET_SIZE } = limits;
  const fileSize = await getFileSize(asset.uri);
  if (fileSize <= targetSize) return { ...asset, fileSize };

  const actions =
    asset.width > maxWidth ? [{ resize: { width: maxWidth } }] : [];
  const encode = (compress: number) =>
    ImageManipulator.manipulateAsync(asset.uri, actions, {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
    });

  let result = await encode(0.7);
  let resultSize = await getFileSize(result.uri);
  if (resultSize > targetSize) {
    // Always from the original, so quality isn't lost twice
    result = await encode(0.4);
    resultSize = await getFileSize(result.uri);
  }

  return {
    ...asset,
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize: resultSize,
  };
};
