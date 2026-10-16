import { PIANO_CATEGORY } from "@/constants/Piano";
import { LocalImageAsset, PianoEntryInput } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate, toStoredDate } from "@/utils/dates";
import { getPianoPhotos } from "@/utils/photos";
import { purchasePriceOf } from "@/utils/pianoMoney";
import { rentalDetailsError } from "@/utils/validation";

/** A photo picked on the device that hasn't been uploaded yet. */
export type PianoFormImage = LocalImageAsset & {
  width?: number;
  height?: number;
};

/** A photo in the form: the URL of a saved one, or one picked just now. */
export type PianoFormPhoto = string | PianoFormImage;

/** Where to find a photo of the form, whether saved or just picked. */
export const photoUri = (photo: PianoFormPhoto) =>
  typeof photo === "string" ? photo : photo.uri;

/** What the Create and Edit screens hold while a piano is being filled in. */
export interface PianoFormState {
  category: string;
  title: string;
  description: string;
  // In the order they are shown; the first is the cover
  photos: PianoFormPhoto[];
  make: string;
  companyAssociated: string;
  dateOfPurchase: Date;
  // What it was bought for, for any category; 0 when not known
  purchasePrice: number;
  rentalCustomerName: string;
  rentalCustomerAddress: string;
  rentalCustomerMobileNumber: string;
  rentalStartDate: Date;
  rentalEndDate: Date;
  rentalPrice: number;
  // The refundable deposit for the rental, 0 when there is none, and the day it was received
  rentalDeposit: number;
  depositReceivedOn: Date;
  warehouseStoredSinceDate: Date;
  eventPurchaseFrom: string;
  eventModelNumber: string;
  eventBNumber: string;
  onSalePurchaseFrom: string;
  onSaleImportDate: Date;
  onSalePrice: number;
}

const DATE_FIELDS = [
  "dateOfPurchase",
  "rentalStartDate",
  "rentalEndDate",
  "depositReceivedOn",
  "warehouseStoredSinceDate",
  "onSaleImportDate",
] as const;

export const createEmptyPianoForm = (): PianoFormState => ({
  category: PIANO_CATEGORY.RENTABLE,
  title: "",
  description: "",
  photos: [],
  make: "",
  companyAssociated: "",
  dateOfPurchase: new Date(),
  purchasePrice: 0,
  rentalCustomerName: "",
  rentalCustomerAddress: "",
  rentalCustomerMobileNumber: "",
  rentalStartDate: new Date(),
  rentalEndDate: new Date(),
  rentalPrice: 0,
  rentalDeposit: 0,
  depositReceivedOn: new Date(),
  warehouseStoredSinceDate: new Date(),
  eventPurchaseFrom: "",
  eventModelNumber: "",
  eventBNumber: "",
  onSalePurchaseFrom: "",
  onSaleImportDate: new Date(),
  onSalePrice: 0,
});

/** The form for editing a saved piano, with its saved photos. */
export const pianoToForm = (piano: PianoItem): PianoFormState => ({
  category: piano.category || "",
  title: piano.title || "",
  description: piano.description || "",
  photos: getPianoPhotos(piano),
  make: piano.make || "",
  companyAssociated: piano.company_associated || "",
  dateOfPurchase: parseStoredDate(piano.date_of_purchase) ?? new Date(),
  purchasePrice: purchasePriceOf(piano) ?? 0,
  rentalCustomerName: piano.rental_customer_name || "",
  rentalCustomerAddress: piano.rental_customer_address || "",
  rentalCustomerMobileNumber: piano.rental_customer_mobile || "",
  rentalStartDate: parseStoredDate(piano.rental_period_start) ?? new Date(),
  rentalEndDate: parseStoredDate(piano.rental_period_end) ?? new Date(),
  rentalPrice: piano.rental_price || 0,
  rentalDeposit: piano.rental_deposit || 0,
  depositReceivedOn: parseStoredDate(piano.deposit_received_on) ?? new Date(),
  warehouseStoredSinceDate:
    parseStoredDate(piano.warehouse_since_date) ?? new Date(),
  eventPurchaseFrom: piano.event_purchase_from || "",
  eventModelNumber: piano.event_model_number || "",
  eventBNumber: piano.event_b_number || "",
  onSalePurchaseFrom: piano.on_sale_purchase_from || "",
  onSaleImportDate: parseStoredDate(piano.on_sale_import_date) ?? new Date(),
  onSalePrice: piano.on_sale_price || 0,
});

/**
 * Reads a form passed between screens as JSON, turning its dates back into
 * Dates. Anything the JSON leaves out is what an empty form has.
 */
export const parsePianoForm = (json: string): PianoFormState => {
  const parsed = { ...createEmptyPianoForm(), ...JSON.parse(json) };
  DATE_FIELDS.forEach((field) => {
    parsed[field] = new Date(parsed[field]);
  });
  return parsed;
};

export interface PianoFormProblem {
  title: string;
  message: string;
}

const missing = (message: string): PianoFormProblem => ({
  title: "Missing Details",
  message,
});

const isBlank = (value: string) => !value.trim();

/** Whether anything has been entered: what leaving the Add flow would lose. */
export const hasEntries = (form: PianoFormState) =>
  form.photos.length > 0 ||
  !!form.make ||
  !!form.companyAssociated ||
  form.rentalPrice > 0 ||
  form.rentalDeposit > 0 ||
  form.purchasePrice > 0 ||
  form.onSalePrice > 0 ||
  [
    form.title,
    form.description,
    form.rentalCustomerName,
    form.rentalCustomerAddress,
    form.rentalCustomerMobileNumber,
    form.eventPurchaseFrom,
    form.eventModelNumber,
    form.eventBNumber,
    form.onSalePurchaseFrom,
  ].some((text) => !isBlank(text));

/** Why the first step of the Add flow can't be left yet, or null if it's complete. */
export const basicsProblem = (form: PianoFormState): PianoFormProblem | null => {
  if (!form.category) return missing("Please choose a category.");
  if (form.photos.length === 0) return missing("Please add a photo.");
  if (isBlank(form.title)) return missing("Please enter a title.");
  if (!form.make) return missing("Please choose the make.");
  if (!form.companyAssociated) return missing("Please choose the company.");
  if (isBlank(form.description)) return missing("Please add some notes.");
  return null;
};

/** Why the form can't be saved yet, or null if it's complete. */
export const pianoFormProblem = (
  form: PianoFormState
): PianoFormProblem | null => basicsProblem(form) ?? categoryProblem(form);

/** Why the details of the piano's category are not complete, or null. */
export const categoryProblem = (
  form: PianoFormState
): PianoFormProblem | null => {
  switch (form.category) {
    case PIANO_CATEGORY.RENTABLE: {
      if (
        isBlank(form.rentalCustomerName) ||
        isBlank(form.rentalCustomerAddress) ||
        isBlank(form.rentalCustomerMobileNumber) ||
        form.rentalPrice <= 0
      ) {
        return missing("Please fill all rental details.");
      }
      const problem = rentalDetailsError({
        mobile: form.rentalCustomerMobileNumber,
        startDate: form.rentalStartDate,
        endDate: form.rentalEndDate,
      });
      return problem
        ? { title: "Check the rental details", message: problem }
        : null;
    }
    case PIANO_CATEGORY.EVENTS:
      return isBlank(form.eventPurchaseFrom) ||
        isBlank(form.eventModelNumber) ||
        isBlank(form.eventBNumber)
        ? missing("Please fill all event details.")
        : null;
    case PIANO_CATEGORY.ON_SALE:
      return isBlank(form.onSalePurchaseFrom) || form.onSalePrice <= 0
        ? missing("Please fill all sale details.")
        : null;
    default:
      return null;
  }
};

// A customer belongs to a rental; the rest of a category's details are
// kept when the category changes, but only shown for their own category
const NO_CUSTOMER = {
  rental_customer_name: null,
  rental_customer_address: null,
  rental_customer_mobile: null,
  // A deposit belongs to the rental too: with no rental there is none held
  rental_deposit: null,
  deposit_received_on: null,
};

/**
 * The piano to save: the details every piano has plus those of its category.
 * Its photos are the saved ones to keep and the newly picked ones to upload.
 * A piano that isn't a rental has no customer, so any customer details left
 * from when it was one are cleared.
 */
export const toPianoEntryInput = (
  form: PianoFormState,
  { user }: { user: { $id: string; accountId: string } }
): PianoEntryInput => {
  const basics: PianoEntryInput = {
    users: user.$id,
    creator: user.accountId,
    category: form.category,
    make: form.make,
    title: form.title,
    description: form.description,
    company_associated: form.companyAssociated,
    photos: form.photos,
    date_of_purchase: toStoredDate(form.dateOfPurchase),
    // Saved for every piano, 0 when not known, so it is what counts from now on (utils/pianoMoney.ts)
    purchase_price: form.purchasePrice > 0 ? form.purchasePrice : 0,
  };

  switch (form.category) {
    case PIANO_CATEGORY.RENTABLE:
      return {
        ...basics,
        rental_customer_name: form.rentalCustomerName,
        rental_customer_address: form.rentalCustomerAddress,
        rental_customer_mobile: form.rentalCustomerMobileNumber,
        rental_period_start: toStoredDate(form.rentalStartDate),
        rental_period_end: toStoredDate(form.rentalEndDate),
        rental_price: form.rentalPrice,
        // Optional: nothing typed means no deposit. The day it was received only goes with an amount.
        rental_deposit: form.rentalDeposit > 0 ? form.rentalDeposit : null,
        deposit_received_on: form.rentalDeposit > 0 ? toStoredDate(form.depositReceivedOn) : null,
      };
    case PIANO_CATEGORY.WAREHOUSE:
      return {
        ...basics,
        ...NO_CUSTOMER,
        warehouse_since_date: toStoredDate(form.warehouseStoredSinceDate),
      };
    case PIANO_CATEGORY.EVENTS:
      return {
        ...basics,
        ...NO_CUSTOMER,
        // The same as Bought for, which took the place of the events' own Purchase price
        event_purchase_price: form.purchasePrice,
        event_purchase_from: form.eventPurchaseFrom,
        event_model_number: form.eventModelNumber,
        event_b_number: form.eventBNumber,
      };
    case PIANO_CATEGORY.ON_SALE:
      return {
        ...basics,
        ...NO_CUSTOMER,
        on_sale_purchase_from: form.onSalePurchaseFrom,
        on_sale_import_date: toStoredDate(form.onSaleImportDate),
        on_sale_price: form.onSalePrice,
      };
    default:
      return { ...basics, ...NO_CUSTOMER };
  }
};
