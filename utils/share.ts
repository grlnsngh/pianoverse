import { PIANO_CATEGORY } from "@/app/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { formatRupees } from "@/utils/money";
import { getCategoryLabel } from "@/utils/ObjectManipulation";

/**
 * A plain-text summary of a piano for the share sheet. Leaves out customer
 * details and what was paid for it, since this is meant for other people.
 */
export const buildShareMessage = (piano: PianoItem) => {
  const lines = [
    piano.title,
    `${piano.make} · ${getCategoryLabel(piano.category)}`,
    piano.description?.trim(),
  ];
  if (
    piano.category === PIANO_CATEGORY.ON_SALE &&
    piano.on_sale_price != null
  ) {
    lines.push(`Price: ${formatRupees(piano.on_sale_price)}`);
  }
  return lines.filter(Boolean).join("\n");
};
