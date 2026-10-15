import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import { ID } from "react-native-appwrite";
import { createFormEvent } from "@/lib/appwrite";
import {
  appVersionFor,
  cleanQueue,
  sendFailure,
  type FormEvent,
  type FormEventAction,
  type FormEventForm,
} from "@/utils/formEvents";

/**
 * The usage counts of the paper forms, kept on the phone until they are sent
 * (utils/formEvents.ts). Counting never gets in the way of a PDF: nothing here
 * throws, waits on the network, or tells the person anything. A count made
 * without a connection waits and goes with the next one, or when the app
 * comes back to the front.
 */

const KEY = "paperForms:events";

// One change to the stored queue at a time, so a count made while others are
// being sent is never lost
let lock: Promise<unknown> = Promise.resolve();
const withQueue = <T,>(work: (queue: FormEvent[]) => Promise<{ queue?: FormEvent[]; result: T }>): Promise<T> => {
  const run = lock.then(async () => {
    let queue: FormEvent[];
    try {
      queue = cleanQueue(JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]"));
    } catch {
      queue = [];
    }
    const { queue: next, result } = await work(queue);
    if (next) {
      if (next.length) await AsyncStorage.setItem(KEY, JSON.stringify(cleanQueue(next)));
      else await AsyncStorage.removeItem(KEY);
    }
    return result;
  });
  lock = run.catch(() => undefined);
  return run;
};

let sending: Promise<void> | null = null;

/**
 * Sends what is waiting, oldest first. Stops at the first count that can't go
 * yet (no connection, signed out) and keeps it and the rest for later; lets go
 * of one Appwrite will never take. Only one send runs at a time.
 */
export const sendFormEvents = (): Promise<void> => {
  if (!sending) {
    sending = (async () => {
      try {
        for (;;) {
          const next = await withQueue(async (queue) => ({ result: queue[0] ?? null }));
          if (!next) return;
          let done = true;
          try {
            await createFormEvent(next);
          } catch (error) {
            // Already sent (409) or never acceptable: let it go
            if (sendFailure(error) === "retry") done = false;
            else console.warn("A form usage count was not accepted:", error);
          }
          if (!done) return;
          await withQueue(async (queue) => ({ queue: queue.filter((event) => event.id !== next.id), result: null }));
        }
      } catch (error) {
        console.warn("Could not send the form usage counts:", error);
      } finally {
        sending = null;
      }
    })();
  }
  return sending;
};

/**
 * Counts that `form` was opened, saved, printed or shared by `creator` (the
 * account ID), and sends it when it can. Does nothing without an account.
 */
export const recordFormEvent = (
  creator: string | null | undefined,
  form: FormEventForm,
  action: FormEventAction,
  pages?: number | null
): void => {
  if (!creator) return;
  const event: FormEvent = {
    id: ID.unique(),
    creator,
    form,
    action,
    pages: typeof pages === "number" ? pages : null,
    happenedAt: new Date().toISOString(),
    appVersion: appVersionFor(Constants.expoConfig?.version, Updates.updateId, Updates.isEmbeddedLaunch),
    platform: Platform.OS,
  };
  withQueue(async (queue) => ({ queue: [...queue, event], result: null }))
    .then(() => sendFormEvents())
    .catch((error) => console.warn("Could not keep a form usage count:", error));
};

/** Forgets the counts not sent yet: at sign out and on deleting the account. */
export const forgetFormEvents = (): Promise<void> =>
  withQueue(async () => ({ queue: [], result: undefined })).catch((error) =>
    console.warn("Could not forget the form usage counts:", error)
  );

/** The counts waiting to be sent. For tests and checks. */
export const waitingFormEvents = (): Promise<FormEvent[]> => withQueue(async (queue) => ({ result: queue }));
