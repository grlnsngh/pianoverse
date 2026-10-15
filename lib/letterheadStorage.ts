import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cleanDesign,
  cleanLetterhead,
  DEFAULT_DESIGN,
  EMPTY_LETTERHEAD,
  isEmptyLetterhead,
  type Letterhead,
  type LetterheadDesign,
} from "@/utils/letterhead";

const KEY = "paperForms:letterhead";
const DESIGN_KEY = "paperForms:letterheadDesign";

/**
 * The business details printed on the paper forms, as typed on this phone.
 * Nothing stored or unreadable counts as empty, so the forms print with lines
 * to write on instead.
 */
export const loadLetterhead = async (): Promise<Letterhead> => {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    return stored ? cleanLetterhead(JSON.parse(stored)) : EMPTY_LETTERHEAD;
  } catch (error) {
    console.warn("Could not read the letterhead:", error);
    return EMPTY_LETTERHEAD;
  }
};

/** Remembers the details, cleaned, or forgets them when all are empty. Resolves to whether it was saved. */
export const saveLetterhead = async (letterhead: Letterhead): Promise<boolean> => {
  try {
    const clean = cleanLetterhead(letterhead);
    if (isEmptyLetterhead(clean)) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, JSON.stringify(clean));
    return true;
  } catch (error) {
    console.warn("Could not save the letterhead:", error);
    return false;
  }
};

/**
 * How the letterhead looks (the style, the design and colour, the images and
 * spaces), as chosen on this phone. Nothing stored or unreadable is the
 * default: Monogram in copper.
 */
export const loadLetterheadDesign = async (): Promise<LetterheadDesign> => {
  try {
    const stored = await AsyncStorage.getItem(DESIGN_KEY);
    return stored ? cleanDesign(JSON.parse(stored)) : DEFAULT_DESIGN;
  } catch (error) {
    console.warn("Could not read the letterhead design:", error);
    return DEFAULT_DESIGN;
  }
};

/** Remembers the design, cleaned. Resolves to whether it was saved. */
export const saveLetterheadDesign = async (design: LetterheadDesign): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(DESIGN_KEY, JSON.stringify(cleanDesign(design)));
    return true;
  } catch (error) {
    console.warn("Could not save the letterhead design:", error);
    return false;
  }
};

/** Forgets the details and the design, when the person signs out or deletes their account, so the next person doesn't print them. */
export const clearLetterhead = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([KEY, DESIGN_KEY]);
  } catch (error) {
    console.warn("Could not clear the letterhead:", error);
  }
};
