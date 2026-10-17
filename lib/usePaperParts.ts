import { useEffect, useState } from "react";
import { loadPaperParts, type PaperParts } from "@/lib/paperPdf";
import type { LetterheadDesign } from "@/utils/letterhead";

/**
 * The fonts and letterhead images a preview needs, read for the design on
 * screen; null until they are read. Read again only when something they
 * depend on changes (the style, design, lettering, an image or the picture),
 * not when the colour, a space, or the picture's place, size or strength does.
 */
const usePaperParts = (design: LetterheadDesign): PaperParts | null => {
  const [parts, setParts] = useState<PaperParts | null>(null);
  const key = [
    design.style,
    design.template,
    design.elegant,
    design.logo?.file ?? "",
    design.upload.image?.file ?? "",
    design.picture.source,
    design.picture.image?.file ?? "",
  ].join("|");
  useEffect(() => {
    let active = true;
    loadPaperParts(design)
      .then((loaded) => {
        if (active) setParts(loaded);
      })
      .catch((error) => console.warn("Could not prepare the preview:", error));
    return () => {
      active = false;
    };
    // Only what the fonts and images depend on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return parts;
};

export default usePaperParts;
