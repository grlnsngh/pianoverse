import {
  createServiceEntry,
  deleteServiceEntry,
  getServiceLog,
  updateServiceEntry,
  type NewServiceEntry,
  type ServiceEntryChanges,
} from "@/lib/appwrite";
import type { PianoItem } from "@/redux/pianos/types";
import { scheduleAllServiceNotifications, type TuningReminder } from "@/services/notifications";
import { parseStoredDate } from "@/utils/dates";
import { groupByPiano } from "@/utils/byPiano";
import { serviceState, type ServiceEntry, type ServiceKind } from "@/utils/serviceLog";
import { showToast } from "@/utils/toast";

/**
 * The owner's tuning and service log while the app is open: read from
 * Appwrite once per account, shared by Today and every piano's page, and
 * kept up to date as entries are logged, changed and deleted (each with the
 * message and Undo the payments have). After every change the 9:00 tuning
 * reminders are set again.
 */

export type ServiceLogStatus = "idle" | "loading" | "ready" | "error";

export interface ServiceLogState {
  accountId: string | null;
  entries: ServiceEntry[];
  status: ServiceLogStatus;
}

const INITIAL: ServiceLogState = { accountId: null, entries: [], status: "idle" };

let state: ServiceLogState = INITIAL;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const set = (next: Partial<ServiceLogState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

export const getServiceLogState = (): ServiceLogState => state;

export const subscribeServiceLog = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// The pianos the reminders are for, as the screens last handed them over
let pianos: PianoItem[] = [];

/**
 * Sets the 9:00 reminder for each piano's next tuning still ahead, once the
 * log is read (before that it would remove every reminder). `next` is the
 * pianos as they are now (useTuningReminders hands them over); without it the
 * last ones handed over are used, as after logging a service.
 */
export const rescheduleTuningReminders = (next?: PianoItem[]) => {
  if (next) pianos = next;
  if (state.status !== "ready") return Promise.resolve([]);
  const reminders: TuningReminder[] = [];
  const byPiano = groupByPiano(state.entries);
  for (const piano of pianos) {
    const tuning = serviceState(piano, byPiano.get(piano.$id) ?? []);
    if (tuning && tuning.days >= 0) {
      reminders.push({
        pianoId: piano.$id,
        title: piano.title,
        who: piano.rental_customer_name?.trim() || null,
        due: tuning.next,
      });
    }
  }
  return scheduleAllServiceNotifications(reminders);
};

/** Reads the account's log, once (again with `force`, as when Today is pulled down). */
export const loadServiceLog = (accountId: string | null | undefined, force = false): Promise<void> => {
  if (!accountId) return Promise.resolve();
  if (state.accountId !== accountId) {
    loading = null;
    set({ accountId, entries: [], status: "idle" });
  }
  if (loading && !force) return loading;
  if (state.status !== "ready") set({ status: "loading" });
  const request = (async () => {
    try {
      const entries = await getServiceLog(accountId);
      if (state.accountId !== accountId) return;
      set({ entries, status: "ready" });
      void rescheduleTuningReminders();
    } catch (error) {
      console.warn("Could not load the service log:", error);
      if (state.accountId === accountId) set({ status: state.entries.length ? "ready" : "error" });
      loading = null;
    }
  })();
  loading = request;
  return request;
};

const changed = (entries: ServiceEntry[]) => {
  set({ entries });
  void rescheduleTuningReminders();
};

/** What putting a change back needs: the same fields, as the entry had them. */
const before = (entry: ServiceEntry, changes: ServiceEntryChanges): ServiceEntryChanges => ({
  ...(changes.servicedOn !== undefined ? { servicedOn: parseStoredDate(entry.serviced_on) ?? new Date() } : {}),
  ...(changes.kind !== undefined ? { kind: entry.kind as ServiceKind } : {}),
  ...(changes.cost !== undefined ? { cost: entry.cost ?? null } : {}),
  ...(changes.note !== undefined ? { note: entry.note ?? "" } : {}),
});

const failed = (message: string, retry?: () => void) =>
  showToast(message, {
    variant: "error",
    duration: "long",
    ...(retry ? { action: { label: "Retry", onPress: retry } } : {}),
  });

/** Keeps a new service. Resolves to whether it was saved; the sheet stays open when it wasn't. */
export const addServiceEntry = async (entry: Omit<NewServiceEntry, "creator">): Promise<boolean> => {
  if (!state.accountId) {
    failed("Please sign in again.");
    return false;
  }
  try {
    const created = await createServiceEntry({ ...entry, creator: state.accountId });
    changed([created, ...state.entries]);
    showToast("Service logged", { variant: "success" });
    return true;
  } catch (error) {
    console.warn("Could not save the service:", error);
    failed("Couldn’t save. Check your connection.");
    return false;
  }
};

/** Keeps a deleted entry again, as it was: what Undo on "Service deleted" does. */
const restore = async (entry: ServiceEntry) => {
  try {
    const created = await createServiceEntry({
      pianoId: entry.piano_id,
      creator: entry.creator,
      servicedOn: parseStoredDate(entry.serviced_on) ?? new Date(),
      kind: entry.kind as ServiceKind,
      cost: entry.cost ?? null,
      note: entry.note ?? null,
    });
    changed([created, ...state.entries]);
    showToast("Service restored", { variant: "success" });
  } catch (error) {
    console.warn("Could not restore the service:", error);
    failed("Couldn’t restore it. Check your connection.");
  }
};

export const removeServiceEntry = async function remove(entry: ServiceEntry): Promise<boolean> {
  try {
    await deleteServiceEntry(entry.$id);
    changed(state.entries.filter((candidate) => candidate.$id !== entry.$id));
    showToast("Service deleted", {
      variant: "success",
      duration: "long",
      action: { label: "Undo", onPress: () => restore(entry) },
    });
    return true;
  } catch (error) {
    console.warn("Could not delete the service:", error);
    failed("Couldn’t delete. Check your connection.", () => remove(entry));
    return false;
  }
};

const replace = (updated: ServiceEntry) =>
  changed(state.entries.map((candidate) => (candidate.$id === updated.$id ? updated : candidate)));

/** Puts a changed entry back as it was: what Undo on "Service updated" does. */
const revert = async (entry: ServiceEntry, changes: ServiceEntryChanges) => {
  try {
    replace(await updateServiceEntry(entry.$id, before(entry, changes)));
    showToast("Change undone", { variant: "success" });
  } catch (error) {
    console.warn("Could not undo the change to the service:", error);
    failed("Couldn’t undo the change. Check your connection.");
  }
};

export const changeServiceEntry = async (entry: ServiceEntry, changes: ServiceEntryChanges): Promise<boolean> => {
  try {
    replace(await updateServiceEntry(entry.$id, changes));
    showToast("Service updated", {
      variant: "success",
      duration: "long",
      action: { label: "Undo", onPress: () => revert(entry, changes) },
    });
    return true;
  } catch (error) {
    console.warn("Could not change the service:", error);
    failed("Couldn’t save. Check your connection.");
    return false;
  }
};

/** Forgets the log and its reminders on this phone: at sign out and on deleting the account. */
export const forgetServiceLog = async () => {
  loading = null;
  pianos = [];
  set(INITIAL);
  await scheduleAllServiceNotifications([]);
};

/** Starts again from nothing. For tests. */
export const resetServiceLogForTests = () => {
  loading = null;
  pianos = [];
  state = INITIAL;
  listeners.clear();
};
