import { useEffect, useState } from "react";
import { loadPianosFromCache } from "@/lib/pianoCache";

/**
 * When the pianos on this phone were last saved, or null if they never were
 * (or the copy can't be read). It reads the saved copy again whenever
 * `refreshKey` changes, such as each time the screen is shown.
 */
const useSavedAt = (accountId: string | undefined, refreshKey: unknown) => {
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) {
      setSavedAt(null);
      return;
    }
    let current = true;
    loadPianosFromCache(accountId).then((cached) => {
      if (current) setSavedAt(cached?.savedAt ?? null);
    });
    return () => {
      current = false;
    };
  }, [accountId, refreshKey]);

  return savedAt;
};

export default useSavedAt;
