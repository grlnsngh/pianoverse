import { Alert, Linking } from "react-native";
import { toNationalMobile } from "@/utils/validation";

/**
 * The number in international form, digits only (as WhatsApp links want).
 * Customers are in India, so Indian numbers get the 91 country code.
 */
export const toInternationalDigits = (mobile: string) => {
  const national = toNationalMobile(mobile);
  return national ? `91${national}` : mobile.replace(/\D/g, "");
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
