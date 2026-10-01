import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useGlobalContext } from "@/context/GlobalProvider";
import { signInWithGoogle } from "@/lib/googleSignIn";
import type { GoogleReturnPath } from "@/lib/googleReturn";
import { googleFailure } from "@/utils/googleSignIn";
import { showToast } from "@/utils/toast";

/**
 * "Continue with Google" for the Sign in and Create account screens. `start`
 * opens Google; on success the person is signed in and taken to the app, when
 * they close Google's page nothing happens, and when it fails `onFailure` is
 * given the words for the red box (and "" when a new attempt starts, to clear it).
 */
const useGoogleSignIn = (
  startedFrom: GoogleReturnPath,
  onFailure: (message: string) => void
) => {
  const { setUser, setIsLogged } = useGlobalContext();
  const [busy, setBusy] = useState(false);
  // A second press while the first is still going is ignored
  const running = useRef(false);

  const start = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    onFailure("");
    try {
      const result = await signInWithGoogle(startedFrom);
      if (result.status === "signed_in") {
        setUser(result.user);
        setIsLogged(true);
        showToast("Welcome! Signed in with Google");
        router.replace("/home");
      }
    } catch (error) {
      onFailure(googleFailure(error));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [startedFrom, onFailure, setUser, setIsLogged]);

  return { busy, start };
};

export default useGoogleSignIn;
