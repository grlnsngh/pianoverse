import { format } from "date-fns";
import type { IconName } from "@/components/ui/Icon";
import { PIANO_CATEGORY } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { isSold } from "@/utils/pianoStatus";
import { getPianoRentalStatus, StatusTone } from "@/utils/rentalStatus";

type DisplayFields = Pick<
  PianoItem,
  | "category"
  | "rental_period_end"
  | "rental_price"
  | "event_purchase_price"
  | "on_sale_price"
  | "sold_date"
  | "sold_price"
  | "warehouse_since_date"
>;

/** What a piano's card or row says about it. */
export interface PianoDisplay {
  /** "Rentable", "Events", "On sale" or "Warehouse" */
  categoryLabel: string;
  categoryIcon: IconName;
  /** The amount that goes with the category, or null (a warehouse piano has none) */
  price: string | null;
  /** One line about where the piano stands, and how urgent that is */
  status: { text: string; tone: StatusTone };
  /**
   * A badge for the photo: only a rental that is overdue (`late`) or ends
   * within a week (`soon`) gets one, with the same words as the status line.
   */
  badge: { text: string; tone: "late" | "soon" } | null;
  /**
   * What follows the price on a card: the status in grey (" · 12 days left")
   * when there is no badge to carry it, and nothing when there is one.
   */
  cardRest: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  [PIANO_CATEGORY.RENTABLE]: "Rentable",
  [PIANO_CATEGORY.EVENTS]: "Events",
  [PIANO_CATEGORY.ON_SALE]: "On sale",
  [PIANO_CATEGORY.WAREHOUSE]: "Warehouse",
};

const CATEGORY_ICONS: Record<string, IconName> = {
  [PIANO_CATEGORY.RENTABLE]: "categoryRentable",
  [PIANO_CATEGORY.EVENTS]: "categoryEvents",
  [PIANO_CATEGORY.ON_SALE]: "categoryOnSale",
  [PIANO_CATEGORY.WAREHOUSE]: "categoryWarehouse",
};

/** An amount as rupees, or null when there is none to show. */
const rupees = (amount: number | null | undefined) =>
  amount ? formatRupees(amount) : null;

/** "Mar 2026", or null. */
const monthAndYear = (value: DisplayFields["warehouse_since_date"]) => {
  const date = parseStoredDate(value);
  return date ? format(date, "MMM yyyy") : null;
};

/**
 * Everything the Pianos list says about a piano: the category, the price that
 * goes with it, a status line and, for a rental that needs attention, a badge.
 */
export const getPianoDisplay = (piano: DisplayFields): PianoDisplay => {
  const categoryLabel = CATEGORY_LABELS[piano.category] ?? "Unknown category";
  const categoryIcon = CATEGORY_ICONS[piano.category] ?? "categoryAll";

  if (isSold(piano)) {
    const soldOn = parseStoredDate(piano.sold_date);
    const text = soldOn ? `Sold ${format(soldOn, "d MMM yyyy")}` : "Sold";
    return {
      categoryLabel,
      categoryIcon,
      price: rupees(piano.sold_price),
      status: { text, tone: "normal" },
      badge: null,
      cardRest: piano.sold_price ? " · Sold" : "Sold",
    };
  }

  switch (piano.category) {
    case PIANO_CATEGORY.RENTABLE: {
      const status = getPianoRentalStatus(piano) ?? {
        text: "Available",
        tone: "normal" as const,
      };
      const badge =
        status.tone === "normal"
          ? null
          : { text: status.text, tone: status.tone };
      const price = rupees(piano.rental_price);
      return {
        categoryLabel,
        categoryIcon,
        price,
        status,
        badge,
        // No separator when there is no price in front of it
        cardRest: badge ? "" : `${price ? " · " : ""}${status.text}`,
      };
    }
    case PIANO_CATEGORY.EVENTS:
      return plain(categoryLabel, categoryIcon, rupees(piano.event_purchase_price), "Event stock");
    case PIANO_CATEGORY.ON_SALE:
      return plain(categoryLabel, categoryIcon, rupees(piano.on_sale_price), "Listed for sale");
    case PIANO_CATEGORY.WAREHOUSE: {
      const since = monthAndYear(piano.warehouse_since_date);
      const text = since ? `Stored since ${since}` : "In the warehouse";
      // A warehouse piano has no price, so the card says where it is instead
      return { ...plain(categoryLabel, categoryIcon, null, text), cardRest: text };
    }
    default:
      return plain(categoryLabel, categoryIcon, null, categoryLabel);
  }
};

/** A piano whose status is a fixed phrase in the normal tone. */
const plain = (
  categoryLabel: string,
  categoryIcon: IconName,
  price: string | null,
  text: string
): PianoDisplay => ({
  categoryLabel,
  categoryIcon,
  price,
  status: { text, tone: "normal" },
  badge: null,
  cardRest: "",
});
