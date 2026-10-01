/**
 * The line at the bottom of Account that says which app this is: the version,
 * and when the app is running an update that came over the air instead of the
 * one built into it, the start of that update's ID. A person can read it out
 * to say what they have, and it shows an update has arrived.
 */
export const versionLabel = (
  version: string | null | undefined,
  updateId: string | null | undefined,
  isEmbedded: boolean | null | undefined
): string | null => {
  if (!version) return null;
  return updateId && isEmbedded === false
    ? `Version ${version} · update ${updateId.slice(0, 8)}`
    : `Version ${version}`;
};
