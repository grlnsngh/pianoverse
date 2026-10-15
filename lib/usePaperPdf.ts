import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { recordFormEvent } from "@/lib/formEvents";
import {
  isPrintCancelled,
  openPdf,
  printPdf,
  sharePdf,
  type SavedPdf,
} from "@/lib/paperPdf";
import type { RootState } from "@/redux/store";
import type { FormEventForm } from "@/utils/formEvents";
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
 * `make` makes the PDF from what the screen shows now. `form` is what the
 * usage counts call it: each PDF saved, printed or shared is counted
 * (lib/formEvents.ts), quietly and after the fact.
 */
const usePaperPdf = (make: () => Promise<SavedPdf>, form: FormEventForm) => {
  const creator = useSelector((state: RootState) => state.users.user?.accountId);
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

  const count = (action: "saved" | "printed" | "shared", made: SavedPdf) =>
    recordFormEvent(creator, form, action, made.pages);

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
        count("saved", made);
      } else if (action === "print") {
        await printPdf(made);
        count("printed", made);
      } else {
        await sharePdf(made);
        count("shared", made);
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
      if (what === "open") {
        await openPdf(pdf);
      } else if (what === "print") {
        await printPdf(pdf);
        count("printed", pdf);
      } else {
        await sharePdf(pdf);
        count("shared", pdf);
      }
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
