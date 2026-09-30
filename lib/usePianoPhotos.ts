import { Dispatch, SetStateAction, useCallback } from "react";
import { MAX_PHOTOS } from "@/utils/photos";
import { PhotoSource, pickPianoPhoto } from "@/utils/photo";
import { PianoFormState } from "@/utils/pianoForm";

/**
 * The ways the piano forms change their photos: add one taken or chosen just
 * now (at the end, up to the limit), remove one, or make one the cover.
 * `addPhoto` says "camera-denied" when the camera was refused, so the screen
 * can explain how to allow it.
 */
const usePianoPhotos = (setForm: Dispatch<SetStateAction<PianoFormState>>) => {
  const addPhoto = useCallback(
    async (source: PhotoSource): Promise<"camera-denied" | undefined> => {
      let denied = false;
      const photo = await pickPianoPhoto(source, () => {
        denied = true;
      });
      if (denied) return "camera-denied";
      if (!photo) return;
      setForm((current) =>
        current.photos.length >= MAX_PHOTOS
          ? current
          : { ...current, photos: [...current.photos, photo] }
      );
    },
    [setForm]
  );

  const removePhoto = useCallback(
    (index: number) =>
      setForm((current) => ({
        ...current,
        photos: current.photos.filter((_, i) => i !== index),
      })),
    [setForm]
  );

  const makeCover = useCallback(
    (index: number) =>
      setForm((current) => ({
        ...current,
        photos: [
          current.photos[index],
          ...current.photos.filter((_, i) => i !== index),
        ],
      })),
    [setForm]
  );

  return { addPhoto, removePhoto, makeCover };
};

export default usePianoPhotos;
