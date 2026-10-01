export type TextPart = { text: string; match: boolean };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Cuts `text` into the pieces that match the search `term` and the pieces
 * around them, ignoring case. The term is trimmed, as the search itself does,
 * so "  yam " marks the same letters as "yam".
 */
export const splitMatches = (text: string, term: string): TextPart[] => {
  const needle = term.trim();
  if (!needle || !text) return [{ text, match: false }];

  const parts: TextPart[] = [];
  const pattern = new RegExp(escapeRegExp(needle), "gi");
  let last = 0;
  for (const found of text.matchAll(pattern)) {
    const start = found.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), match: false });
    parts.push({ text: found[0], match: true });
    last = start + found[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length > 0 ? parts : [{ text, match: false }];
};
