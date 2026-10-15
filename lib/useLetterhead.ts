import { useEffect, useRef, useState } from "react";
import { loadLetterhead, saveLetterhead } from "@/lib/letterheadStorage";
import { EMPTY_LETTERHEAD, type Letterhead, type LetterheadKey } from "@/utils/letterhead";

/**
 * The business details on a paper form's screen: read from the phone when the
 * screen opens, changed as they are typed, and remembered when a field is left
 * or a PDF is made. A detail typed before the saved ones were read is kept,
 * not overwritten by them.
 */
const useLetterhead = () => {
  const [letterhead, setLetterhead] = useState<Letterhead>(EMPTY_LETTERHEAD);
  const typed = useRef(new Set<LetterheadKey>());

  useEffect(() => {
    let active = true;
    loadLetterhead().then((saved) => {
      if (!active) return;
      setLetterhead((current) => {
        const merged = { ...saved };
        typed.current.forEach((key) => {
          merged[key] = current[key];
        });
        return merged;
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const change = (key: LetterheadKey) => (text: string) => {
    typed.current.add(key);
    setLetterhead((current) => ({ ...current, [key]: text }));
  };

  /** Keeps what is on screen now. */
  const remember = () => saveLetterhead(letterhead);

  return { letterhead, change, remember };
};

export default useLetterhead;
