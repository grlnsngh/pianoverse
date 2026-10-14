import { useEffect, useRef, useState } from "react";
import {
  isPrintCancelled,
  openPdf,
  printPdf,
  sharePdf,
  type SavedPdf,
} from "@/lib/paperPdf";
import { savedTap } from "@/utils/haptics";
import { showToast } from "@/utils/toast";

/** What a paper form's buttons do: keep the PDF and say so, or make it and print or share it at once. */
export type PaperAction = "save" | "print" | "share";

const FAILED: Record<"make" | "open" | "print" | "share", string> = {
  make: "Couldn’t make the PDF. Try again.",
  open: "Couldn’t open the PDF. Try Share instead.",
  print: "Couldn’t print. Try Share instead.",
  share: "Couldn’t share the PDF. Try again.",
};

/**
 * The making of a paper form's PDF and what follows (PaperFormDetail and
 * PaperSaved boards): Save PDF makes it and opens the sheet that says it is
 * ready; Print and Share make it and go straight to the phone's print screen
 * or share sheet. One thing at a time: while one runs, `busy` says which.
 *
 * `make` makes the PDF from what the screen shows now.
 */
const usePaperPdf = (make: () => Promise<SavedPdf>) => {
  const [busy, setBusy] = useState<PaperAction | null>(null);
  const [pdf, setPdf] = useState<SavedPdf | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  const fail = (what: keyof typeof FAILED, error: unknown) => {
    // Closing the print screen without printing isn't a failure
    if (what === "print" && isPrintCancelled(error)) return;
    console.warn(`Paper form: couldn't ${what} the PDF:`, error);
    showToast(FAILED[what], { variant: "error" });
  };

  const run = async (action: PaperAction) => {
    if (busy) return;
    setBusy(action);
    let made: SavedPdf;
    try {
      made = await make();
    } catch (error) {
      fail("make", error);
      if (mounted.current) setBusy(null);
      return;
    }
    if (!mounted.current) return;
    setPdf(made);
    try {
      if (action === "save") {
        savedTap();
        setSheetOpen(true);
      } else if (action === "print") {
        await printPdf(made);
      } else {
        await sharePdf(made);
      }
    } catch (error) {
      fail(action === "save" ? "make" : action, error);
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  /** What the ready sheet's buttons do with the PDF just made. */
  const withSaved = (what: "open" | "print" | "share") => async () => {
    if (!pdf) return;
    try {
      await (what === "open" ? openPdf : what === "print" ? printPdf : sharePdf)(pdf);
    } catch (error) {
      fail(what, error);
    }
  };

  return {
    busy,
    pdf,
    sheetOpen,
    closeSheet: () => setSheetOpen(false),
    save: () => run("save"),
    print: () => run("print"),
    share: () => run("share"),
    openSaved: withSaved("open"),
    printSaved: withSaved("print"),
    shareSaved: withSaved("share"),
  };
};

export default usePaperPdf;
