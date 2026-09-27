// Only the first screenful of rows fades in one after another. Rows further
// down mount while scrolling and must show straight away; delaying them by
// index × 100ms left row 80 invisible for 8 seconds.
const STAGGERED_ROWS = 8;
const STAGGER_MS = 100;

/** How long a list row waits before its entrance animation starts. */
export const getEntranceDelay = (index = 0) =>
  index < STAGGERED_ROWS ? index * STAGGER_MS : 0;
