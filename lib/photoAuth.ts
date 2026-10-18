import { useEffect, useMemo, useState } from "react";
import * as appwrite from "@/lib/appwrite";
import { isStorageUrl, photoHeaders, TOKEN_FRESH_MS } from "@/utils/photoAuth";

// The token that lets this phone load the signed-in person's photos (Batch 51,
// SEC1). One is shared by every photo on screen and made again once it is 10
// minutes old, not once a photo: Appwrite allows only so many a hour.

let token: { jwt: string; madeAt: number } | null = null;
let pending: Promise<string | null> | null = null;

/** The token, if there is one that is still fresh. */
export const peekPhotoToken = (now = Date.now()): string | null =>
  token && now - token.madeAt < TOKEN_FRESH_MS ? token.jwt : null;

/**
 * A fresh token, made if needed: null when there is none (no connection, or
 * nobody signed in). Asked for twice at once, it is made once.
 */
export const getPhotoToken = (): Promise<string | null> => {
  const fresh = peekPhotoToken();
  if (fresh) return Promise.resolve(fresh);
  if (pending) return pending;
  const made = (async () => {
    try {
      const jwt = await appwrite.createPhotoToken();
      token = { jwt, madeAt: Date.now() };
      return jwt;
    } catch {
      return null;
    } finally {
      pending = null;
    }
  })();
  pending = made;
  return made;
};

/** Drops the token, as when someone signs out: the next person never loads photos as them. */
export const forgetPhotoToken = () => {
  token = null;
  pending = null;
};

/** Sets the token without asking Appwrite. For tests. */
export const setPhotoTokenForTests = (jwt: string | null, madeAt = Date.now()) => {
  token = jwt ? { jwt, madeAt } : null;
  pending = null;
};

/** What an image needs to be loaded: its address, and the headers that say whose photo it is. */
export type PhotoSource = { uri: string; headers?: Record<string, string>; cacheKey?: string };

/**
 * The source to give an image for the photo at `uri`, or null while it isn't
 * ready (the token is on its way: draw the stand-in meanwhile). A photo in
 * Appwrite's storage gets the token; anything else is loaded as it is. With no
 * connection and so no token, a photo is still tried without one, so the copy
 * the phone already keeps of it shows.
 *
 * The address alone is the photo's key in the phone's picture cache, so a new
 * token never makes it load again.
 */
export const usePhotoSource = (uri: string | null | undefined): PhotoSource | null => {
  // Read through the module, so a test that stands in for it without its settings gets plain photos
  const config = appwrite.appwriteConfig;
  const inStorage = !!config && isStorageUrl(uri, config.endpoint);
  const [jwt, setJwt] = useState<string | null>(() => (inStorage ? peekPhotoToken() : null));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!inStorage || jwt) return;
    let cancelled = false;
    getPhotoToken().then((next) => {
      if (cancelled) return;
      setJwt(next);
      setSettled(true);
    });
    return () => {
      cancelled = true;
    };
  }, [inStorage, jwt]);

  return useMemo(() => {
    if (!uri) return null;
    if (!inStorage) return { uri };
    if (!jwt && !settled) return null;
    return {
      uri,
      cacheKey: uri,
      ...(jwt && config ? { headers: photoHeaders(jwt, config.projectId) } : {}),
    };
  }, [uri, inStorage, jwt, settled, config]);
};
