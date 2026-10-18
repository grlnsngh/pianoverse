import { ImageManipulator, type SaveFormat } from "expo-image-manipulator";

export type EncodeOptions = {
  /** Scale to this width, keeping the shape; left out, the size stays as it is. */
  width?: number;
  /** 0 (smallest) to 1 (best). */
  compress: number;
  format: SaveFormat;
};

/**
 * Makes a picture from the file at `uri` (a photo the person picked), scaled
 * and saved as asked, and says where it is and how big it is.
 *
 * This is expo-image-manipulator's contextual API, which replaced
 * `manipulateAsync`: the picture is loaded once, resized, drawn and saved.
 * Both objects hold the picture in the phone's memory until they are released,
 * so they are released as soon as the file is saved.
 */
export const encodeImage = async (uri: string, { width, compress, format }: EncodeOptions) => {
  const context = ImageManipulator.manipulate(uri);
  try {
    if (width !== undefined) context.resize({ width });
    const image = await context.renderAsync();
    try {
      return await image.saveAsync({ compress, format });
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
};
