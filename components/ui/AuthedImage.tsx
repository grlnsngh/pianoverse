import { Image, ImageProps } from "expo-image";
import React from "react";
import { usePhotoSource } from "@/lib/photoAuth";

export type AuthedImageProps = Omit<ImageProps, "source"> & {
  /** The photo's address */
  uri: string;
  /** Drawn while the photo's token is on its way (a moment, on the first photo after the app opens) */
  fallback?: React.ReactNode;
};

/**
 * A photo from the storage or from anywhere else. A photo in Appwrite's storage
 * belongs to its owner, so the image is asked for with the signed-in person's
 * token (lib/photoAuth.ts); other addresses are loaded as they are.
 */
const AuthedImage = ({ uri, fallback = null, ...rest }: AuthedImageProps) => {
  const source = usePhotoSource(uri);
  return source ? <Image {...rest} source={source} /> : <>{fallback}</>;
};

export default AuthedImage;
