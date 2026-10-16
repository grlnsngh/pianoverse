import React, { useEffect, useRef, useState } from "react";
import EditRentalSheet from "@/components/EditRentalSheet";
import RentalActionsSheet, { type RentalAction } from "@/components/RentalActionsSheet";
import type { OwnerRentalHistory } from "@/lib/useOwnerRentalHistory";
import type { RentalHistoryEntry } from "@/lib/appwrite";
import { showDialog } from "@/utils/dialog";
import { rentalLabel } from "@/utils/rentalHistoryEdit";

// A sheet takes 240 ms to leave; what it chose runs after that, so the next
// sheet or dialog isn't started under one that is still going
const SHEET_CLOSE_MS = 300;

/**
 * Everything a screen needs to fix the kept rentals it shows (a piano's
 * Previous renters and a customer's Rental history): press and hold one for
 * its menu, edit it, delete it after asking. `subjectOf` names the piano a
 * rental was on, for the Edit rental sheet's heading. Returns the handlers and
 * the sheets to draw.
 */
const useRentalSheets = (
  history: Pick<OwnerRentalHistory, "change" | "remove">,
  subjectOf: (entry: RentalHistoryEntry) => string
) => {
  const [held, setHeld] = useState<RentalHistoryEntry | null>(null);
  const [editing, setEditing] = useState<RentalHistoryEntry | null>(null);
  // The one being changed stays for the sheet while it leaves
  const [subject, setSubject] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const edit = (entry: RentalHistoryEntry) => {
    setSubject(subjectOf(entry));
    setEditing(entry);
  };

  const confirmDelete = (entry: RentalHistoryEntry) =>
    showDialog({
      title: "Delete this rental?",
      message: `${rentalLabel(entry)} will be removed from the history of ${subjectOf(entry)}. What the customer paid stays recorded.`,
      actions: [
        { label: "Delete", tone: "destructive", onPress: () => history.remove(entry) },
        { label: "Cancel", onPress: () => {} },
      ],
    });

  const choose = (action: RentalAction) => {
    const entry = held;
    setHeld(null);
    if (!entry) return;
    timer.current = setTimeout(() => (action === "edit" ? edit(entry) : confirmDelete(entry)), SHEET_CLOSE_MS);
  };

  const sheets = (
    <>
      <RentalActionsSheet entry={held} onClose={() => setHeld(null)} onSelect={choose} />
      <EditRentalSheet
        entry={editing}
        subject={subject}
        onClose={() => setEditing(null)}
        onSave={history.change}
      />
    </>
  );

  return { hold: setHeld, edit, confirmDelete, sheets };
};

export default useRentalSheets;
