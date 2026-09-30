jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));

import React from "react";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import Create from "@/app/create";
import { prepareImageForUpload } from "@/utils/image";
import { testUser } from "./helpers/fixtures";
import { createTestStore, pressText, renderWithStore } from "./helpers/render";

const KB = 1024;
const MB = 1024 * KB;
let sizes: Record<string, number>;
let encodedSize: (compress: number) => number;

beforeEach(() => {
  jest.clearAllMocks();
  sizes = {};
  jest.spyOn(global, "fetch").mockImplementation(
    async (uri: any) => ({ blob: async () => ({ size: sizes[uri] }) }) as any
  );
  let encodes = 0;
  jest
    .mocked(ImageManipulator.manipulateAsync)
    .mockImplementation(async (_uri, actions: any, options: any) => {
      const uri = `file:///cache/ImageManipulator/out-${++encodes}.jpg`;
      sizes[uri] = encodedSize(options.compress);
      const width = actions[0]?.resize?.width ?? 1200;
      return { uri, width, height: (width * 3) / 4 };
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const photo = (width: number, size: number) => {
  const uri = `file:///cache/ImagePicker/photo-${width}.jpeg`;
  sizes[uri] = size;
  return { uri, width, height: (width * 3) / 4, fileName: "photo.jpeg", type: "image" as const };
};

describe("preparing a photo for upload", () => {
  it("keeps a small photo as it is", async () => {
    const small = photo(1200, 300 * KB);

    const result = await prepareImageForUpload(small);

    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
    expect(result).toMatchObject({ uri: small.uri, fileSize: 300 * KB });
  });

  it("scales a large photo down and encodes it once", async () => {
    encodedSize = () => 420 * KB;
    const large = photo(4000, 6 * MB);

    const result = await prepareImageForUpload(large);

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(1);
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      large.uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.7, format: "jpeg" }
    );
    expect(result).toMatchObject({ width: 1600, height: 1200, fileSize: 420 * KB });
    expect(result.uri).toMatch(/ImageManipulator/);
  });

  it("tries one stronger pass from the original if still too big", async () => {
    encodedSize = (compress) => (compress >= 0.7 ? 800 * KB : 450 * KB);
    const large = photo(4000, 6 * MB);

    const result = await prepareImageForUpload(large);

    const calls = jest.mocked(ImageManipulator.manipulateAsync).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][0]).toBe(large.uri);
    expect(calls[1][2]).toMatchObject({ compress: 0.4 });
    expect(result.fileSize).toBe(450 * KB);
  });

  it("doesn't resize a heavy photo that is already narrow", async () => {
    encodedSize = () => 300 * KB;

    await prepareImageForUpload(photo(1200, 900 * KB));

    expect(jest.mocked(ImageManipulator.manipulateAsync).mock.calls[0][1]).toEqual([]);
  });
});

it("the Create screen re-encodes a big, detailed photo at most twice", async () => {
  // A photo that stays over 500 KB however much it is compressed
  encodedSize = () => 800 * KB;
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [photo(4000, 8 * MB)],
  } as any);
  const renderer = renderWithStore(<Create />, createTestStore({ user: testUser }));

  await pressText(renderer.root, "Choose a file");

  expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(2);
});
