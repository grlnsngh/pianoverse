import { useEffect, useSyncExternalStore } from "react";
import { useSelector } from "react-redux";
import {
  addServiceEntry,
  changeServiceEntry,
  getServiceLogState,
  loadServiceLog,
  removeServiceEntry,
  rescheduleTuningReminders,
  subscribeServiceLog,
} from "@/lib/serviceLogStore";
import type { RootState } from "@/redux/store";

/**
 * The signed-in owner's tuning and service log (lib/serviceLogStore.ts), read
 * the first time a screen asks and the same on every screen, with what logs,
 * changes and deletes an entry. `reload` reads it again (pull to refresh).
 */
const useServiceLog = () => {
  const accountId = useSelector((state: RootState) => state.users.user?.accountId);
  const log = useSyncExternalStore(subscribeServiceLog, getServiceLogState, getServiceLogState);
  useEffect(() => {
    void loadServiceLog(accountId);
  }, [accountId]);
  const mine = !!accountId && log.accountId === accountId;
  return {
    entries: mine ? log.entries : [],
    // Nobody signed in has nothing to wait for
    status: !accountId ? "ready" : mine ? log.status : "loading",
    reload: () => loadServiceLog(accountId, true),
    add: addServiceEntry,
    change: changeServiceEntry,
    remove: removeServiceEntry,
  } as const;
};

/**
 * Sets the tuning reminders again whenever the pianos change (an interval
 * changed, a piano sold, deleted or added), once the log is read.
 */
export const useTuningReminders = () => {
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const status = useSyncExternalStore(subscribeServiceLog, () => getServiceLogState().status, () => getServiceLogState().status);
  useEffect(() => {
    // Handed over even before the log is read, so its first reminders are for these
    void rescheduleTuningReminders(pianos);
  }, [pianos, status]);
};

export default useServiceLog;
