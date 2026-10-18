jest.mock("react-native-appwrite", () => require("./helpers/fakeAppwrite").createFakeAppwriteModule());

import { Image } from "expo-image";
import React from "react";
import { Text } from "react-native";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { AuthedImage, PianoPhoto } from "@/components/ui";
import { appwriteConfig } from "@/lib/appwrite";
import {
  forgetPhotoToken,
  getPhotoToken,
  peekPhotoToken,
  setPhotoTokenForTests,
  usePhotoSource,
} from "@/lib/photoAuth";
import { isStorageUrl, photoHeaders, TOKEN_FRESH_MS, TOKEN_LIFETIME_MS } from "@/utils/photoAuth";
import { appwriteError, fakeAccount, fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";

// Batch 51 (SEC1): a photo belongs to its owner, so an image asks with a
// short-lived token, and only Appwrite's own storage ever gets to see it

const STORAGE_URL = fileViewUrl("abc");
const GOOGLE_PHOTO = "https://lh3.googleusercontent.com/a/photo=s96-c";

beforeEach(() => {
  fakeBackend.reset();
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const render = (element: React.ReactElement) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  return renderer;
};
const settle = () => act(async () => {});
const images = (renderer: ReactTestRenderer) => renderer.root.findAllByType(Image);

describe("which addresses get the token", () => {
  const endpoint = appwriteConfig.endpoint;

  it("is Appwrite's storage, and nothing else", () => {
    expect(isStorageUrl(STORAGE_URL, endpoint)).toBe(true);
    expect(isStorageUrl(`${endpoint}/storage/buckets/b/files/f/view?project=p`, endpoint)).toBe(true);
    expect(isStorageUrl(GOOGLE_PHOTO, endpoint)).toBe(false);
    expect(isStorageUrl("file:///data/user/0/photo.jpg", endpoint)).toBe(false);
    expect(isStorageUrl(null, endpoint)).toBe(false);
    expect(isStorageUrl(undefined, endpoint)).toBe(false);
    // Appwrite's own address, but not its storage
    expect(isStorageUrl(`${endpoint}/account`, endpoint)).toBe(false);
  });

  it("is never an address that only looks like it", () => {
    expect(isStorageUrl("https://cloud.appwrite.io.evil.example/v1/storage/f", endpoint)).toBe(false);
    expect(isStorageUrl("https://evil.example/https://cloud.appwrite.io/v1/storage/f", endpoint)).toBe(false);
    expect(isStorageUrl("http://cloud.appwrite.io/v1/storage/f", endpoint)).toBe(false);
    expect(isStorageUrl("https://cloud.appwrite.io@evil.example/v1/storage/f", endpoint)).toBe(false);
  });

  it("says whose photo it is, with the project and the token", () => {
    expect(photoHeaders("the-jwt", "proj")).toEqual({
      "X-Appwrite-Project": "proj",
      "X-Appwrite-JWT": "the-jwt",
    });
  });

  it("makes a new token before the old one runs out", () => {
    expect(TOKEN_LIFETIME_MS).toBe(15 * 60 * 1000);
    expect(TOKEN_FRESH_MS).toBeLessThan(TOKEN_LIFETIME_MS);
  });
});

describe("the token", () => {
  beforeEach(() => forgetPhotoToken());

  it("is made once when two photos ask at the same time", async () => {
    const [a, b] = await Promise.all([getPhotoToken(), getPhotoToken()]);

    expect([a, b]).toEqual(["test-jwt", "test-jwt"]);
    expect(fakeAccount.createJWT).toHaveBeenCalledTimes(1);
  });

  it("is kept for 10 minutes, then made again", async () => {
    await getPhotoToken();
    expect(peekPhotoToken()).toBe("test-jwt");

    jest.setSystemTime(Date.now() + TOKEN_FRESH_MS - 1000);
    fakeAccount.createJWT.mockResolvedValue({ jwt: "second" });
    expect(await getPhotoToken()).toBe("test-jwt");
    expect(fakeAccount.createJWT).toHaveBeenCalledTimes(1);

    jest.setSystemTime(Date.now() + 2000);
    expect(peekPhotoToken()).toBeNull();
    expect(await getPhotoToken()).toBe("second");
    expect(fakeAccount.createJWT).toHaveBeenCalledTimes(2);
  });

  it("is null when Appwrite can't be reached, and asked for again next time", async () => {
    fakeAccount.createJWT.mockRejectedValueOnce(appwriteError("Network request failed"));

    expect(await getPhotoToken()).toBeNull();
    expect(peekPhotoToken()).toBeNull();
    expect(await getPhotoToken()).toBe("test-jwt");
  });

  it("is dropped on sign out, so the next person never loads photos as the last", async () => {
    await getPhotoToken();
    forgetPhotoToken();

    expect(peekPhotoToken()).toBeNull();
  });
});

describe("a photo in the storage", () => {
  const Probe = ({ uri }: { uri: string | null }) => {
    const source = usePhotoSource(uri);
    return <Text testID="probe">{source ? JSON.stringify(source) : "waiting"}</Text>;
  };
  const sourceOf = (renderer: ReactTestRenderer) => {
    const text = renderer.root.findByProps({ testID: "probe" }).props.children as string;
    return text === "waiting" ? null : JSON.parse(text);
  };

  it("is asked for with the token and the project, and cached by its address alone", () => {
    const renderer = render(<AuthedImage uri={STORAGE_URL} />);

    expect(images(renderer)[0].props.source).toEqual({
      uri: STORAGE_URL,
      cacheKey: STORAGE_URL,
      headers: { "X-Appwrite-Project": appwriteConfig.projectId, "X-Appwrite-JWT": "test-jwt" },
    });
    expect(fakeAccount.createJWT).not.toHaveBeenCalled();
  });

  it("waits for the token, showing the stand-in, then loads", async () => {
    setPhotoTokenForTests(null);
    let release!: (token: { jwt: string }) => void;
    fakeAccount.createJWT.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    const renderer = render(<AuthedImage uri={STORAGE_URL} fallback={<Text>stand-in</Text>} />);

    expect(images(renderer)).toHaveLength(0);
    expect(renderer.root.findByType(Text).props.children).toBe("stand-in");

    await act(async () => release({ jwt: "fresh" }));

    expect(renderer.root.findAllByType(Text)).toHaveLength(0);
    expect(images(renderer)[0].props.source.headers["X-Appwrite-JWT"]).toBe("fresh");
  });

  it("is tried without a token when there is no connection, so the copy the phone keeps still shows", async () => {
    setPhotoTokenForTests(null);
    fakeAccount.createJWT.mockRejectedValue(appwriteError("Network request failed"));
    const renderer = render(<AuthedImage uri={STORAGE_URL} />);

    await settle();

    expect(images(renderer)[0].props.source).toEqual({ uri: STORAGE_URL, cacheKey: STORAGE_URL });
  });

  it("keeps the same source while nothing changes, so the photo isn't loaded again", async () => {
    const renderer = render(<Probe uri={STORAGE_URL} />);
    const first = renderer.root.findByProps({ testID: "probe" }).props.children;

    await act(async () => renderer.update(<Probe uri={STORAGE_URL} />));

    expect(renderer.root.findByProps({ testID: "probe" }).props.children).toBe(first);
  });

  it("is waited for only until the first token is in hand", async () => {
    setPhotoTokenForTests(null);
    const first = render(<Probe uri={STORAGE_URL} />);
    expect(sourceOf(first)).toBeNull();
    await settle();
    expect(sourceOf(first)).not.toBeNull();

    // The next photo has it at once
    expect(sourceOf(render(<Probe uri={`${STORAGE_URL}&v=2`} />))).not.toBeNull();
    expect(fakeAccount.createJWT).toHaveBeenCalledTimes(1);
  });
});

describe("a photo from anywhere else", () => {
  it("never gets the token, and doesn't ask for one", async () => {
    setPhotoTokenForTests(null);
    const renderer = render(<AuthedImage uri={GOOGLE_PHOTO} />);
    await settle();

    expect(images(renderer)[0].props.source).toEqual({ uri: GOOGLE_PHOTO });
    expect(fakeAccount.createJWT).not.toHaveBeenCalled();
  });

  it("never gets it even when its address merely looks like the storage's", () => {
    const lookalike = "https://cloud.appwrite.io.evil.example/v1/storage/buckets/b/files/f/view";
    const renderer = render(<AuthedImage uri={lookalike} />);

    expect(images(renderer)[0].props.source).toEqual({ uri: lookalike });
  });

  it("draws nothing without an address", () => {
    const renderer = render(<AuthedImage uri={""} fallback={<Text>none</Text>} />);

    expect(images(renderer)).toHaveLength(0);
    expect(renderer.root.findByType(Text).props.children).toBe("none");
  });
});

describe("a piano's photo", () => {
  it("shows its drawing for the moment the token takes, then the photo", async () => {
    setPhotoTokenForTests(null);
    let release!: (token: { jwt: string }) => void;
    fakeAccount.createJWT.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    const renderer = render(<PianoPhoto id="p1" uri={STORAGE_URL} />);

    expect(images(renderer)).toHaveLength(0);

    await act(async () => release({ jwt: "fresh" }));

    expect(images(renderer)).toHaveLength(1);
    expect(images(renderer)[0].props.source.headers).toMatchObject({ "X-Appwrite-JWT": "fresh" });
  });
});
