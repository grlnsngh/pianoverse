/**
 * Rows (rent payments, services) grouped by the piano they are for, so the
 * work done for each piano only looks at its own rows. With many pianos, going
 * through every row for every piano is what made Today slow (Batch 50, O2):
 * 90 rentals and 500 payments meant 45,000 dates read for one list.
 */
export const groupByPiano = <T extends { piano_id: string }>(rows: readonly T[]): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(row.piano_id);
    if (group) group.push(row);
    else groups.set(row.piano_id, [row]);
  }
  return groups;
};
