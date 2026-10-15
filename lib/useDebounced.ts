import { useEffect, useState } from "react";

/**
 * `value`, but only once it has stopped changing for `delay` ms: typing doesn't
 * redraw a preview on every letter. When `resetKey` changes (the saved
 * letterhead has just been read) the new value is used at once.
 */
const useDebounced = <T,>(value: T, delay: number, resetKey?: unknown): T => {
  const [settled, setSettled] = useState({ value, key: resetKey });
  if (settled.key !== resetKey) setSettled({ value, key: resetKey });
  useEffect(() => {
    const timer = setTimeout(() => setSettled({ value, key: resetKey }), delay);
    return () => clearTimeout(timer);
  }, [value, delay, resetKey]);
  return settled.key === resetKey ? settled.value : value;
};

export default useDebounced;
