import {
  differenceInCalendarDays,
  format,
  isSameDay,
  isSameYear,
  subDays,
} from "date-fns";

/** The letter in the profile's circle: the first of the username, else of the email. */
export const initialOf = (username?: string | null, email?: string | null) => {
  const source = (username || email || "").trim();
  return source ? source.charAt(0).toUpperCase() : "U";
};

/** "1 day", "4 months", "2 years": how long since the account was made. */
const membershipLength = (since: Date, now: Date) => {
  const days = Math.max(1, differenceInCalendarDays(now, since));
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"}`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"}`;
};

/** "Member for 1 year · since Sep 2025", or null when the account's date isn't known. */
export const memberSince = (
  createdAt: string | undefined | null,
  now = new Date()
): string | null => {
  const since = createdAt ? new Date(createdAt) : null;
  if (!since || isNaN(since.getTime())) return null;
  return `Member for ${membershipLength(since, now)} · since ${format(since, "MMM yyyy")}`;
};

/**
 * When the pianos on this phone were last saved: "Today, 6:40 pm",
 * "Yesterday, 6:40 pm", "28 Sep, 6:40 pm", or with the year for an older one.
 */
export const formatLastUpdated = (savedAt: string, now = new Date()): string => {
  const saved = new Date(savedAt);
  const time = format(saved, "h:mm a").replace(/AM|PM/, (m) => m.toLowerCase());
  if (isSameDay(saved, now)) return `Today, ${time}`;
  if (isSameDay(saved, subDays(now, 1))) return `Yesterday, ${time}`;
  const day = format(saved, isSameYear(saved, now) ? "d MMM" : "d MMM yyyy");
  return `${day}, ${time}`;
};
