import { Alert, Linking, Share } from "react-native";
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

/** Opens a WhatsApp chat with the number, with `text` already typed if given. */
export const messageOnWhatsApp = (mobile: string, text?: string) =>
  open(
    `https://wa.me/${toInternationalDigits(mobile)}${
      text ? `?text=${encodeURIComponent(text)}` : ""
    }`,
    "WhatsApp"
  );

/** Opens the phone's share sheet with a message. */
export const shareMessage = async (message: string, title: string) => {
  try {
    await Share.share({ title, message });
  } catch (error) {
    Alert.alert(
      "Couldn't Share",
      error instanceof Error ? error.message : "Please try again."
    );
  }
};

/** A message for a renter: straight into their WhatsApp chat, or the share sheet without a number. */
export const sendMessage = (mobile: string | null, message: string, title: string) =>
  mobile ? messageOnWhatsApp(mobile, message) : shareMessage(message, title);
