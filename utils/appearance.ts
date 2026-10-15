import type { Scheme } from "@/constants/theme";

/** What the person picked: a theme, or whatever the phone is set to. */
export type AppearanceSetting = "light" | "dark" | "system";

/** In the order Account shows them. */
export const APPEARANCE_SETTINGS: readonly AppearanceSetting[] = [
  "light",
  "dark",
  "system",
];

/**
 * Until the person picks, the app matches the phone: dark on a phone set to
 * dark (the owner's choice, Q34). Before Batch 32 it was light for everybody,
 * and choosing Light saved nothing, so everyone who hadn't picked Dark or
 * Match phone now matches their phone.
 */
export const DEFAULT_APPEARANCE: AppearanceSetting = "system";

export const APPEARANCE_LABELS: Record<AppearanceSetting, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match phone",
};

export const isAppearanceSetting = (
  value: unknown
): value is AppearanceSetting =>
  value === "light" || value === "dark" || value === "system";

/**
 * The theme to draw. "Match phone" follows what the phone says, and is light
 * when the phone doesn't say (older phones, or one the app can't ask).
 */
export const resolveScheme = (
  setting: AppearanceSetting,
  phoneScheme: string | null | undefined
): Scheme => {
  if (setting === "system") return phoneScheme === "dark" ? "dark" : "light";
  return setting;
};
