import AsyncStorage from "@react-native-async-storage/async-storage";
import { cleanLetterhead, EMPTY_LETTERHEAD, isEmptyLetterhead, Letterhead } from "@/utils/letterhead";

const KEY = "paperForms:letterhead";

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

/** Forgets the details, when the person signs out or deletes their account, so the next person doesn't print them. */
export const clearLetterhead = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (error) {
    console.warn("Could not clear the letterhead:", error);
  }
};
