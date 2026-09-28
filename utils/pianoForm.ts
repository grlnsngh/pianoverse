import { PIANO_CATEGORY } from "@/constants/Piano";
import { LocalImageAsset, PianoEntryInput } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate, toStoredDate } from "@/utils/dates";
import { rentalDetailsError } from "@/utils/validation";

/** A photo picked on the device that hasn't been uploaded yet. */
export type PianoFormImage = LocalImageAsset & {
  width?: number;
  height?: number;
};

/** What the Create and Edit screens hold while a piano is being filled in. */
export interface PianoFormState {
  category: string;
  title: string;
  description: string;
  image: PianoFormImage | null;
  make: string;
  companyAssociated: string;
  dateOfPurchase: Date;
  rentalCustomerName: string;
  rentalCustomerAddress: string;
  rentalCustomerMobileNumber: string;
  rentalStartDate: Date;
  rentalEndDate: Date;
  rentalPrice: number;
  warehouseStoredSinceDate: Date;
  eventPurchasePrice: number;
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
  "warehouseStoredSinceDate",
  "onSaleImportDate",
] as const;

export const createEmptyPianoForm = (): PianoFormState => ({
  category: PIANO_CATEGORY.RENTABLE,
  title: "",
  description: "",
  image: null,
  make: "",
  companyAssociated: "",
  dateOfPurchase: new Date(),
  rentalCustomerName: "",
  rentalCustomerAddress: "",
  rentalCustomerMobileNumber: "",
  rentalStartDate: new Date(),
  rentalEndDate: new Date(),
  rentalPrice: 0,
  warehouseStoredSinceDate: new Date(),
  eventPurchasePrice: 0,
  eventPurchaseFrom: "",
  eventModelNumber: "",
  eventBNumber: "",
  onSalePurchaseFrom: "",
  onSaleImportDate: new Date(),
  onSalePrice: 0,
});

/** The form for editing a saved piano (its photo stays until a new one is picked). */
export const pianoToForm = (piano: PianoItem): PianoFormState => ({
  category: piano.category || "",
  title: piano.title || "",
  description: piano.description || "",
  image: null,
  make: piano.make || "",
  companyAssociated: piano.company_associated || "",
  dateOfPurchase: parseStoredDate(piano.date_of_purchase) ?? new Date(),
  rentalCustomerName: piano.rental_customer_name || "",
  rentalCustomerAddress: piano.rental_customer_address || "",
  rentalCustomerMobileNumber: piano.rental_customer_mobile || "",
  rentalStartDate: parseStoredDate(piano.rental_period_start) ?? new Date(),
  rentalEndDate: parseStoredDate(piano.rental_period_end) ?? new Date(),
  rentalPrice: piano.rental_price || 0,
  warehouseStoredSinceDate:
    parseStoredDate(piano.warehouse_since_date) ?? new Date(),
  eventPurchasePrice: piano.event_purchase_price || 0,
  eventPurchaseFrom: piano.event_purchase_from || "",
  eventModelNumber: piano.event_model_number || "",
  eventBNumber: piano.event_b_number || "",
  onSalePurchaseFrom: piano.on_sale_purchase_from || "",
  onSaleImportDate: parseStoredDate(piano.on_sale_import_date) ?? new Date(),
  onSalePrice: piano.on_sale_price || 0,
});

/** Reads a form passed between screens as JSON, turning its dates back into Dates. */
export const parsePianoForm = (json: string): PianoFormState => {
  const parsed = JSON.parse(json);
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

/**
 * Why the form can't be saved yet, or null if it's complete. A piano that
 * already has a photo (when editing) doesn't need a new one.
 */
export const pianoFormProblem = (
  form: PianoFormState,
  { hasSavedPhoto = false } = {}
): PianoFormProblem | null => {
  if (!form.category) return missing("Please choose a category.");
  if (!form.image && !hasSavedPhoto) return missing("Please add a photo.");
  if (isBlank(form.title)) return missing("Please enter a title.");
  if (isBlank(form.description)) return missing("Please enter a description.");
  if (!form.make) return missing("Please choose the make.");
  if (!form.companyAssociated) return missing("Please choose the company.");

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

/**
 * The piano to save: the details every piano has plus those of its category.
 * `image` is the photo to keep (its URL) or a newly picked one to upload.
 */
export const toPianoEntryInput = (
  form: PianoFormState,
  {
    user,
    image,
  }: {
    user: { $id: string; accountId: string };
    image: PianoEntryInput["image_url"];
  }
): PianoEntryInput => {
  const basics: PianoEntryInput = {
    users: user.$id,
    creator: user.accountId,
    category: form.category,
    make: form.make,
    title: form.title,
    description: form.description,
    company_associated: form.companyAssociated,
    image_url: image,
    date_of_purchase: toStoredDate(form.dateOfPurchase),
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
      };
    case PIANO_CATEGORY.WAREHOUSE:
      return {
        ...basics,
        warehouse_since_date: toStoredDate(form.warehouseStoredSinceDate),
      };
    case PIANO_CATEGORY.EVENTS:
      return {
        ...basics,
        event_purchase_price: form.eventPurchasePrice,
        event_purchase_from: form.eventPurchaseFrom,
        event_model_number: form.eventModelNumber,
        event_b_number: form.eventBNumber,
      };
    case PIANO_CATEGORY.ON_SALE:
      return {
        ...basics,
        on_sale_purchase_from: form.onSalePurchaseFrom,
        on_sale_import_date: toStoredDate(form.onSaleImportDate),
        on_sale_price: form.onSalePrice,
      };
    default:
      return basics;
  }
};
