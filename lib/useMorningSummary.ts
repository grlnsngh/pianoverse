import { useEffect } from "react";
import type { RentPayment } from "@/lib/appwrite";
import { useMorningSummarySetting } from "@/lib/morningSummarySetting";
import type { PianoItem } from "@/redux/pianos/types";
import { scheduleMorningSummaries } from "@/services/notifications";
import { morningSummaryPlan } from "@/utils/morningSummary";
import type { ServiceEntry } from "@/utils/serviceLog";

/**
 * Puts the 9:00 morning summaries in place (utils/morningSummary.ts) whenever
 * what they say may have changed: the pianos, the rent payments, the service
 * log, a new day, or the choice to have them. It waits until all of it is known
 * (pianos loaded, payments and the service log read), so that opening the app
 * without a connection never swaps good summaries for poorer ones. Switched
 * off, it removes them.
 *
 * @param ready - the pianos have loaded
 * @param payments - the rent payments, or null while they aren't known
 * @param entries - the service log, or null while it isn't known
 * @param day - the current day, so a new day plans again
 */
const useMorningSummary = (
  ready: boolean,
  pianos: PianoItem[],
  payments: RentPayment[] | null,
  entries: ServiceEntry[] | null,
  day: string
) => {
  const { loaded, enabled } = useMorningSummarySetting();

  useEffect(() => {
    if (!loaded) return;
    if (!enabled) {
      void scheduleMorningSummaries([]);
      return;
    }
    if (!ready || !payments || !entries) return;
    void scheduleMorningSummaries(morningSummaryPlan(new Date(), pianos, payments, entries));
  }, [loaded, enabled, ready, pianos, payments, entries, day]);
};

export default useMorningSummary;
