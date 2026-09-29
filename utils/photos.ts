import { PianoItem } from "@/redux/pianos/types";

/** How many photos a piano can have. */
export const MAX_PHOTOS = 10;

/**
 * The URLs of a piano's photos in the order they are shown, the cover first.
 * Pianos saved before there were several photos only have `image_url`.
 */
export const getPianoPhotos = (
  piano: Pick<PianoItem, "image_url" | "image_urls">
): string[] => {
  const urls = (piano.image_urls ?? []).filter(Boolean);
  if (urls.length > 0) return urls;
  return piano.image_url ? [piano.image_url] : [];
};
