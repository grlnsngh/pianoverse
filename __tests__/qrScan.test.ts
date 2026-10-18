import { redirectSystemPath } from "@/app/+native-intent";
import {
  clearPendingPianoLink,
  setPendingPianoLink,
  takePendingPianoLink,
} from "@/lib/pendingPianoLink";
import { pianoLink } from "@/utils/qrLabels";
import { pianoIdFromLabel, pianoIdFromLink } from "@/utils/qrScan";

/** Reading a QR label and a link that opens the app (canvas page "QR labels"). */

const ID = "64f1a2b3c4d5e6f7a8b9";

beforeEach(() => clearPendingPianoLink());

describe("a code scanned by the app", () => {
  it("is one of ours when it holds a piano's link, and names the piano", () => {
    expect(pianoIdFromLabel(`pianoverse://detail/${ID}`)).toBe(ID);
  });

  it("is read back from whatever a label makes", () => {
    expect(pianoIdFromLabel(pianoLink(ID))).toBe(ID);
    expect(pianoIdFromLabel(pianoLink("weber_w-121.2"))).toBe("weber_w-121.2");
  });

  it("ignores the spaces round it, the case of the scheme, a last slash and anything after ? or #", () => {
    expect(pianoIdFromLabel(`  pianoverse://detail/${ID}\n`)).toBe(ID);
    expect(pianoIdFromLabel(`PIANOVERSE://detail/${ID}`)).toBe(ID);
    expect(pianoIdFromLabel(`pianoverse://detail/${ID}/`)).toBe(ID);
    expect(pianoIdFromLabel(`pianoverse://detail/${ID}?ref=label`)).toBe(ID);
    expect(pianoIdFromLabel(`pianoverse://detail/${ID}#top`)).toBe(ID);
  });

  it.each([
    ["a web address", "https://example.com/detail/" + ID],
    ["another app's link", "otherapp://detail/" + ID],
    ["our scheme, another page", "pianoverse://income"],
    ["our scheme, no piano", "pianoverse://detail/"],
    ["a path that goes further", `pianoverse://detail/${ID}/photos`],
    ["an ID that can't be one (a symbol first)", "pianoverse://detail/-abc"],
    ["an ID too long to be one", "pianoverse://detail/" + "a".repeat(37)],
    ["an ID with a space in it", "pianoverse://detail/abc def"],
    ["plain text", "piano 12"],
    ["nothing", ""],
  ])("is not one of ours: %s", (_name, data) => {
    expect(pianoIdFromLabel(data)).toBeNull();
  });

  it("is not one of ours when there is nothing", () => {
    expect(pianoIdFromLabel(null)).toBeNull();
    expect(pianoIdFromLabel(undefined)).toBeNull();
  });
});

describe("a link that opens the app", () => {
  it("names the piano whether it comes with its scheme or already as a path", () => {
    expect(pianoIdFromLink(`pianoverse://detail/${ID}`)).toBe(ID);
    expect(pianoIdFromLink(`/detail/${ID}`)).toBe(ID);
    expect(pianoIdFromLink(`/detail/${ID}/`)).toBe(ID);
  });

  it("is nothing for any other address, which the app handles as it always did", () => {
    expect(pianoIdFromLink("pianoverse://income")).toBeNull();
    expect(pianoIdFromLink("/home")).toBeNull();
    expect(pianoIdFromLink("https://pianoverse.example/detail/" + ID)).toBeNull();
    expect(pianoIdFromLink("/detail/")).toBeNull();
    expect(pianoIdFromLink(null)).toBeNull();
  });
});

describe("an address from outside", () => {
  it("that names a piano is kept, and the app starts at its first screen", () => {
    expect(redirectSystemPath({ path: `pianoverse://detail/${ID}`, initial: true })).toBe("/");
    expect(takePendingPianoLink()).toBe(ID);
  });

  it("that names a piano when the app is already open is kept the same way", () => {
    expect(redirectSystemPath({ path: `/detail/${ID}`, initial: false })).toBe("/");
    expect(takePendingPianoLink()).toBe(ID);
  });

  it("leaves Google's sign-in return where it went", () => {
    const path = "appwrite-callback-66b2693000154e2fa3c8://?userId=1&secret=2";
    expect(redirectSystemPath({ path, initial: false })).not.toBe("/");
    expect(takePendingPianoLink()).toBeNull();
  });

  it("opens the first screen, whatever any other address asks for", () => {
    for (const path of [
      "/income",
      "pianoverse://income",
      "pianoverse://letterhead-upload",
      "pianoverse://edit/abc",
      "pianoverse://detail/../income",
      "exp+pianoverse://expo-development-client/?url=http%3A%2F%2Fexample.com",
      "https://example.com/detail/abc",
      "",
    ]) {
      expect(redirectSystemPath({ path, initial: false })).toBe("/");
      expect(redirectSystemPath({ path, initial: true })).toBe("/");
    }
    expect(takePendingPianoLink()).toBeNull();
  });

  it("is still the first screen for the address of the app itself", () => {
    expect(redirectSystemPath({ path: "/", initial: true })).toBe("/");
  });
});

describe("a piano waiting to be opened", () => {
  it("is given once, then it is gone", () => {
    setPendingPianoLink(ID);

    expect(takePendingPianoLink()).toBe(ID);
    expect(takePendingPianoLink()).toBeNull();
  });

  it("is the last one when a second arrives", () => {
    setPendingPianoLink("first");
    setPendingPianoLink("second");

    expect(takePendingPianoLink()).toBe("second");
  });

  it("can be forgotten, so the next person never opens it", () => {
    setPendingPianoLink(ID);

    clearPendingPianoLink();

    expect(takePendingPianoLink()).toBeNull();
  });
});
