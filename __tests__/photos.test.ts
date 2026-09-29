import { getPianoPhotos, MAX_PHOTOS } from "@/utils/photos";

describe("a piano's photos", () => {
  it("are the saved list, cover first", () => {
    expect(
      getPianoPhotos({ image_url: "a", image_urls: ["a", "b", "c"] })
    ).toEqual(["a", "b", "c"]);
  });

  it("are just the one image for a piano saved before there were several", () => {
    expect(getPianoPhotos({ image_url: "a" })).toEqual(["a"]);
    expect(getPianoPhotos({ image_url: "a", image_urls: null })).toEqual(["a"]);
    expect(getPianoPhotos({ image_url: "a", image_urls: [] })).toEqual(["a"]);
  });

  it("are none when the piano has no image at all", () => {
    expect(getPianoPhotos({ image_url: "" })).toEqual([]);
    expect(getPianoPhotos({ image_url: "", image_urls: [""] })).toEqual([]);
  });

  it("allow up to ten", () => {
    expect(MAX_PHOTOS).toBe(10);
  });
});
