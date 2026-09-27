import { Alert, Linking } from "react-native";

// Customers are in India: a bare 10-digit mobile gets the +91 country code
const COUNTRY_CODE = "91";

/** The number in international form, digits only (as WhatsApp links want). */
export const toInternationalDigits = (mobile: string) => {
  const digits = mobile.replace(/\D/g, "");
  return digits.length === 10 ? `${COUNTRY_CODE}${digits}` : digits;
};

const open = async (url: string, appName: string) => {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      `Couldn't open ${appName}`,
      "Please try again from your phone."
    );
  }
};

export const callNumber = (mobile: string) =>
  open(`tel:${mobile.replace(/[^\d+]/g, "")}`, "the phone app");

export const messageOnWhatsApp = (mobile: string) =>
  open(`https://wa.me/${toInternationalDigits(mobile)}`, "WhatsApp");
