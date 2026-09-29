import { PIANO_CATEGORY } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { getRentalState, RentalState } from "@/utils/dates";
import { getCategoryLabel } from "@/utils/ObjectManipulation";

type PianoStatusFields = Pick<
  PianoItem,
  "category" | "rental_period_end" | "sold_date"
>;

/** A sold piano keeps its details but is no longer part of the stock. */
export const isSold = (piano: Pick<PianoItem, "sold_date">) =>
  !!piano.sold_date;

/**
 * Whether the piano's rental is running, ends today or has ended. Null for a
 * piano that isn't a rental (rental dates left from when it was one don't
 * count) or has been sold.
 */
export const getPianoRentalState = (
  piano: PianoStatusFields
): RentalState | null =>
  piano.category === PIANO_CATEGORY.RENTABLE && !isSold(piano)
    ? getRentalState(piano.rental_period_end)
    : null;

/** Rented out right now, up to and including the last day. */
export const isCurrentlyRented = (piano: PianoStatusFields) => {
  const state = getPianoRentalState(piano);
  return state === "active" || state === "due_today";
};

/**
 * Still listed as rented although the rental has ended: it should have come
 * back, or be extended.
 */
export const isOverdue = (piano: PianoStatusFields) =>
  getPianoRentalState(piano) === "ended";

/** The category, marked when the piano has been sold ("Rentable · Sold"). */
export const getStatusLabel = (
  piano: Pick<PianoItem, "category" | "sold_date">
) =>
  isSold(piano)
    ? `${getCategoryLabel(piano.category)} · Sold`
    : getCategoryLabel(piano.category);
