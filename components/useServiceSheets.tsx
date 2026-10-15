import React, { useEffect, useRef, useState } from "react";
import LogServiceSheet, { serviceChanges, type ServiceDraft } from "@/components/LogServiceSheet";
import ServiceActionsSheet, { type ServiceAction } from "@/components/ServiceActionsSheet";
import TuningIntervalSheet from "@/components/TuningIntervalSheet";
import useServiceLog from "@/lib/useServiceLog";
import useUpdatePiano from "@/lib/useUpdatePiano";
import { PianoItem } from "@/redux/pianos/types";
import { showDialog } from "@/utils/dialog";
import {
  entriesFor,
  entryDay,
  intervalLabel,
  intervalOf,
  kindOf,
  serviceState,
  type ServiceEntry,
  type TuningInterval,
} from "@/utils/serviceLog";

// A sheet takes 240 ms to leave; what it chose runs after that, so the next
// sheet or dialog isn't started under one that is still going
const SHEET_CLOSE_MS = 300;

/**
 * Everything a screen needs to log, change and delete a piano's services and
 * set its tuning interval (the piano's page and its full list): the handlers,
 * and the sheets to draw.
 */
const useServiceSheets = (piano: PianoItem) => {
  const log = useServiceLog();
  const updatePiano = useUpdatePiano();
  const [logging, setLogging] = useState(false);
  const [editing, setEditing] = useState<ServiceEntry | null>(null);
  const [held, setHeld] = useState<ServiceEntry | null>(null);
  const [choosingInterval, setChoosingInterval] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const later = (work: () => void) => {
    timer.current = setTimeout(work, SHEET_CLOSE_MS);
  };

  const entries = entriesFor(log.entries, piano.$id);
  const state = serviceState(piano, entries);
  const months = intervalOf(piano);

  const confirmDelete = (entry: ServiceEntry) =>
    showDialog({
      title: "Delete this service?",
      message: `${kindOf(entry.kind).label} on ${entryDay(entry)} will be removed from ${piano.title}.`,
      actions: [
        { label: "Delete", tone: "destructive", onPress: () => log.remove(entry) },
        { label: "Cancel", onPress: () => {} },
      ],
    });

  const choose = (action: ServiceAction) => {
    const entry = held;
    setHeld(null);
    if (!entry) return;
    later(() => (action === "edit" ? setEditing(entry) : confirmDelete(entry)));
  };

  const save = (draft: ServiceDraft) =>
    editing
      ? log.change(editing, serviceChanges(editing, draft))
      : log.add({
          pianoId: piano.$id,
          servicedOn: draft.servicedOn,
          kind: draft.kind,
          cost: draft.cost || null,
          note: draft.note,
        });

  const chooseInterval = (chosen: TuningInterval) => {
    setChoosingInterval(false);
    if (chosen === months) return;
    void updatePiano(
      piano,
      { tuning_interval_months: chosen },
      chosen === 0 ? "No tuning reminders for this piano" : `Tuned ${intervalLabel(chosen).toLowerCase()}`
    );
  };

  const fromLogToInterval = () => {
    setLogging(false);
    setEditing(null);
    later(() => setChoosingInterval(true));
  };

  const sheets = (
    <>
      <LogServiceSheet
        piano={piano}
        visible={logging || !!editing}
        entry={editing}
        onClose={() => {
          setLogging(false);
          setEditing(null);
        }}
        onSave={save}
        onChangeInterval={fromLogToInterval}
      />
      <ServiceActionsSheet entry={held} onClose={() => setHeld(null)} onSelect={choose} />
      <TuningIntervalSheet
        piano={piano}
        visible={choosingInterval}
        next={state?.next ?? null}
        onClose={() => setChoosingInterval(false)}
        onSelect={chooseInterval}
      />
    </>
  );

  return {
    log,
    entries,
    state,
    months,
    startLogging: () => setLogging(true),
    hold: setHeld,
    edit: setEditing,
    confirmDelete,
    chooseIntervalOpen: () => setChoosingInterval(true),
    sheets,
  };
};

export default useServiceSheets;
