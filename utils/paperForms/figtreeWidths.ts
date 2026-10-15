/**
 * How wide each character of Figtree is, in thousandths of the font size,
 * regular and bold, as measured in Chromium (the engine that draws the PDFs
 * on Android). Used to work out how many lines a paragraph of the agreement's
 * terms takes, so its pages can be filled without cutting anything off.
 */
const CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~’‘“”₹–—·…";

const REGULAR = [
  247, 298, 320, 629, 563, 786, 644, 200, 352, 352, 481, 623, 226, 417, 208, 389, 641, 413, 559, 544, 621, 575, 566, 537,
  614, 566, 253, 259, 623, 623, 623, 504, 989, 677, 611, 721, 688, 592, 543, 760, 751, 271, 515, 610, 520, 846, 774, 776,
  579, 780, 626, 614, 552, 707, 693, 960, 614, 604, 641, 324, 389, 324, 551, 438, 221, 510, 586, 541, 586, 546, 369, 587,
  558, 232, 269, 485, 220, 851, 558, 580, 591, 578, 338, 466, 378, 558, 520, 784, 475, 526, 491, 385, 257, 385, 567, 181,
  181, 330, 330, 622, 550, 1100, 254, 613,
];

const BOLD = [
  238, 312, 412, 631, 554, 813, 647, 245, 382, 382, 488, 632, 257, 408, 248, 432, 648, 422, 579, 556, 633, 581, 580, 556,
  612, 580, 301, 305, 632, 632, 632, 513, 992, 714, 612, 725, 700, 589, 554, 743, 750, 289, 552, 666, 537, 857, 773, 787,
  603, 789, 645, 607, 584, 704, 722, 985, 679, 647, 632, 344, 432, 344, 581, 434, 263, 533, 596, 546, 595, 554, 393, 601,
  570, 262, 291, 538, 246, 872, 568, 581, 601, 592, 379, 466, 402, 568, 556, 835, 536, 576, 477, 394, 256, 394, 667, 219,
  219, 415, 415, 600, 550, 1100, 260, 709,
];

/** A character not in the table counts as a wide one, so a line is never thought shorter than it is. */
const UNKNOWN = 800;

const INDEX = new Map([...CHARS].map((char, index) => [char, index]));

/** The width of `text` in px at `size` px. */
export const textWidth = (text: string, size: number, bold = false): number => {
  const widths = bold ? BOLD : REGULAR;
  let total = 0;
  for (const char of text) {
    const index = INDEX.get(char);
    total += index === undefined ? UNKNOWN : widths[index];
  }
  return (total * size) / 1000;
};

/** A word that can't be broken: its width in px. */
export type Word = number;

/**
 * How many lines words take in `width` px when wrapped the way a browser
 * does: as many words as fit on a line, a space between them.
 */
export const lineCount = (words: Word[], width: number, space: number): number => {
  let lines = 1;
  let used = 0;
  for (const word of words) {
    if (used === 0) {
      used = word;
    } else if (used + space + word <= width) {
      used += space + word;
    } else {
      lines += 1;
      used = word;
    }
  }
  return lines;
};