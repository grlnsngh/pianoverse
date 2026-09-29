import { PianoItem } from "@/redux/pianos/types";

/** A blank cell that keeps the last row of a grid from stretching. */
export type GridCell = PianoItem & { empty?: boolean };

/**
 * The pianos with blank cells added so the last row of a grid with
 * `columns` columns is full, and a lone last card keeps its width.
 */
export const padToFullRows = (
  pianos: PianoItem[],
  columns: number
): GridCell[] => {
  const blanks = (columns - (pianos.length % columns)) % columns;
  return [
    ...pianos,
    ...Array.from(
      { length: blanks },
      (_, i) =>
        ({ $id: `blank-${i}`, title: `blank-${i}`, empty: true } as GridCell)
    ),
  ];
};
