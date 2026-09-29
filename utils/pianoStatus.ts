import { PIANO_CATEGORY } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { getRentalState, isRentalActive } from "@/utils/dates";
import { getCategoryLabel } from "@/utils/ObjectManipulation";

type PianoStatusFields = Pick<
  PianoItem,
  "category" | "rental_period_end" | "sold_date"
>;

/** A sold piano keeps its details but is no longer part of the stock. */
export const isSold = (piano: Pick<PianoItem, "sold_date">) =>
  !!piano.sold_date;

/** Rented out right now, up to and including the last day. */
export const isCurrentlyRented = (piano: PianoStatusFields) =>
  piano.category === PIANO_CATEGORY.RENTABLE &&
  !isSold(piano) &&
  isRentalActive(piano.rental_period_end);

/**
 * Still listed as rented although the rental has ended: it should have come
 * back, or be extended.
 */
export const isOverdue = (piano: PianoStatusFields) =>
  piano.category === PIANO_CATEGORY.RENTABLE &&
  !isSold(piano) &&
  getRentalState(piano.rental_period_end) === "ended";

/** The category, marked when the piano has been sold ("Rentable · Sold"). */
export const getStatusLabel = (
  piano: Pick<PianoItem, "category" | "sold_date">
) =>
  isSold(piano)
    ? `${getCategoryLabel(piano.category)} · Sold`
    : getCategoryLabel(piano.category);
