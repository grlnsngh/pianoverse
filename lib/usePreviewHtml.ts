import { useMemo, useSyncExternalStore } from "react";
import { getLetterheadState, subscribeLetterhead } from "@/lib/letterheadStore";
import useDebounced from "@/lib/useDebounced";
import usePaperParts from "@/lib/usePaperParts";
import type { Letterhead, LetterheadDesign } from "@/utils/letterhead";
import { previewDocument } from "@/utils/paperForms/html";
import { letterheadCss, type LetterheadAssets } from "@/utils/paperForms/letterheads";

/** Makes one page of a form or an agreement; module-level, so it stays the same between renders. */
export type PageMaker = (details: Letterhead, design: LetterheadDesign, assets: LetterheadAssets) => string;

const readyOf = () => getLetterheadState().ready;

/**
 * The real page for a preview (PaperPreview), `width` px wide, with the
 * letterhead on screen: null until its fonts and images are read. Typing in
 * the details or dragging a slider redraws it once the change stops; the
 * saved letterhead is drawn as soon as it is read.
 */
const usePreviewHtml = (
  design: LetterheadDesign,
  details: Letterhead,
  width: number,
  makePage: PageMaker
): string | null => {
  const ready = useSyncExternalStore(subscribeLetterhead, readyOf, readyOf);
  const settledDetails = useDebounced(details, 350, ready);
  const settledDesign = useDebounced(design, 150, ready);
  const parts = usePaperParts(settledDesign);
  return useMemo(
    () =>
      parts
        ? previewDocument(
            makePage(settledDetails, settledDesign, parts.assets),
            parts.fontCss + letterheadCss(parts.assets),
            width
          )
        : null,
    [parts, settledDetails, settledDesign, width, makePage]
  );
};

export default usePreviewHtml;
