import { categoryOptions, PIANO_CATEGORY } from "@/app/constants/Piano";
import { SECONDARY_COLOR } from "@/constants/colors";
import { PianoItem, PianoItemFormStateType } from "@/redux/pianos/types";

/**
 * Finds and returns the label for a given category value.
 *
 * @param {string | undefined} category - The category value to find the label for.
 * @returns {string} - The label of the category, or "Unknown Category" if not found.
 */
export const printCategoryLabel = (category: string | undefined): string => {
  const option = categoryOptions.find((option) => option.value === category);
  if (option) {
    return option.label;
  } else {
    return "Unknown Category";
  }
};

/**
 * Formats a date to a more readable format including the day of the week.
 *
 * @param {Date | string | undefined | null} dateInput - The date input to format.
 * @returns {string} - The formatted date string, or "N/A" if the input is undefined or null.
 */
export const formatDate = (
  dateInput: Date | string | undefined | null
): string => {
  if (!dateInput) return "N/A";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Searches an array of PianoItems based on a search input.
 * @param items - The array of PianoItems to search.
 * @param searchInput - The search input to match against the PianoItem titles.
 * @returns An array of PianoItems that match the search input.
 */
export const searchPianoItems = (
  items: PianoItem[],
  searchInput: string
): PianoItem[] => {
  const trimmedInput = searchInput.trim();
  if (trimmedInput === "") {
    return items;
  }
  return items.filter((item) =>
    item.title.toLowerCase().includes(trimmedInput.toLowerCase())
  );
};

/**
 * Resets the fields of a PianoItem object based on its category while preserving specific fields.
 *
 * @param {Partial<PianoItemFormStateType>} item - The Partial PianoItemFormStateType object to be reset.
 * @returns {Partial<PianoItemFormStateType>} - The reset Partial PianoItemFormStateType object.
 */
export const resetPianoItem = (
  item: Partial<PianoItemFormStateType>
): Partial<PianoItemFormStateType> => {
  const basicDetails = {
    users: item.users,
    category: item.category,
    make: item.make,
    title: item.title,
    description: item.description,
    image_url: item.image_url,
    creator: item.creator,
    company_associated: item.company_associated,
  };

  let resetItem: Partial<PianoItemFormStateType> = {
    ...basicDetails,
    event_b_number: null,
    event_model_number: null,
    event_purchase_from: null,
    event_purchase_price: null,
    on_sale_import_date: null,
    on_sale_price: null,
    on_sale_purchase_from: null,
    rental_customer_address: null,
    rental_customer_mobile: null,
    rental_customer_name: null,
    rental_period_end: null,
    rental_period_start: null,
    rental_price: null,
    sold_date: null,
    sold_price: null,
    sold_to_address: null,
    sold_to_name: null,
    warehouse_since_date: null,
  };

  switch (item.category) {
    case PIANO_CATEGORY.RENTABLE:
      resetItem = {
        ...resetItem,
        rental_customer_address: item.rental_customer_address,
        rental_customer_mobile: item.rental_customer_mobile,
        rental_customer_name: item.rental_customer_name,
        rental_period_end: item.rental_period_end,
        rental_period_start: item.rental_period_start,
        rental_price: item.rental_price,
      };
      break;
    case PIANO_CATEGORY.EVENTS:
      resetItem = {
        ...resetItem,
        event_b_number: item.event_b_number,
        event_model_number: item.event_model_number,
        event_purchase_from: item.event_purchase_from,
        event_purchase_price: item.event_purchase_price,
      };
      break;
    case PIANO_CATEGORY.ON_SALE:
      resetItem = {
        ...resetItem,
        on_sale_import_date: item.on_sale_import_date,
        on_sale_price: item.on_sale_price,
        on_sale_purchase_from: item.on_sale_purchase_from,
      };
      break;
    case PIANO_CATEGORY.WAREHOUSE:
      resetItem = {
        ...resetItem,
        warehouse_since_date: item.warehouse_since_date,
      };
      break;
    default:
      break;
  }

  return resetItem;
};

/**
 * Formats a date string into a localized date and time string.
 * @param dateString - The date string to format.
 * @returns The formatted date and time string.
 */
export const formatDateString = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    weekday: "short", // "Mon"
    year: "numeric", // "2023"
    month: "short", // "Oct"
    day: "numeric", // "2"
    hour: "numeric", // "10"
    minute: "numeric", // "30"
    second: "numeric", // "15"
    hour12: true, // "AM/PM"
  });
};

/**
 * Creates a button configuration object.
 *
 * @param {Object} form - The form object containing the company association.
 * @param {string} form.companyAssociated - The company associated with the form.
 * @param {string} value - The value associated with the button.
 * @param {string} label - The label to display on the button.
 * @returns {Object} The button configuration object.
 * @returns {string} return.value - The value associated with the button.
 * @returns {string} return.label - The label to display on the button.
 * @returns {Object} return.labelStyle - The style object for the label.
 * @returns {Object} return.style - The style object for the button.
 */
export const createButtonConfig = (form, value, label) => ({
  value,
  label,
  labelStyle: form.companyAssociated === value ? {} : { color: "white" },
  style:
    form.companyAssociated === value
      ? { backgroundColor: SECONDARY_COLOR }
      : {},
});

/**
 * Adds a specified number of hours to a given date.
 *
 * @param {string | Date | null} [inputDate] - The date to which hours will be added. If not provided or null, the current date and time will be used.
 * @param {number} [hoursToAdd=12] - The number of hours to add to the date. Defaults to 12 hours if not specified.
 * @returns {Date} - The new date with the added hours.
 */
export const addHoursToDate = (
  inputDate?: string | Date | null,
  hoursToAdd: number = 12
): Date => {
  const date = inputDate ? new Date(inputDate) : new Date();
  date.setHours(date.getHours() + hoursToAdd);
  return date;
};

/**
 * Retrieves the label for a given category value.
 *
 * @param {string} categoryValue - The value of the category to find the label for.
 * @returns {string} The label corresponding to the category value, or "Unknown Category" if not found.
 */
export const getCategoryLabel = (categoryValue: string): string => {
  const category = categoryOptions.find(
    (option) => option.value === categoryValue
  );
  return category ? category.label : "Unknown Category";
};
