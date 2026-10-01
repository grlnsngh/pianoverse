jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

import { Alert } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { pickPianoPhoto, pickProfilePhoto } from "@/utils/photo";

/** Picking a profile picture (square, small) next to a piano photo (4:3, as before). */

const KB = 1024;
const camera = jest.mocked(ImagePicker.launchCameraAsync);
const library = jest.mocked(ImagePicker.launchImageLibraryAsync);
const permission = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
let sizes: Record<string, number>;

const asset = (width: number, height: number, size: number, uri = `file:///cache/pick-${width}.jpg`) => {
  sizes[uri] = size;
  return { uri, width, height, fileName: "pick.jpg", type: "image" as const };
};
const chosen = (a: ReturnType<typeof asset>) => ({ canceled: false, assets: [a] }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  sizes = {};
  permission.mockResolvedValue({ granted: true } as any);
  jest.spyOn(global, "fetch").mockImplementation(
    async (uri: any) => ({ blob: async () => ({ size: sizes[uri] }) }) as any
  );
  jest.mocked(ImageManipulator.manipulateAsync).mockImplementation(async (_uri, actions: any) => {
    const uri = "file:///cache/out.jpg";
    sizes[uri] = 60 * KB;
    const width = actions[0]?.resize?.width ?? 300;
    return { uri, width, height: width };
  });
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("a profile picture", () => {
  it("is cropped square, from the gallery", async () => {
    library.mockResolvedValue(chosen(asset(400, 400, 80 * KB)));

    const result = await pickProfilePhoto("library");

    expect(library).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }));
    expect(result).toMatchObject({ width: 400, height: 400, fileSize: 80 * KB });
  });

  it("is cropped square, from the camera, once it is allowed", async () => {
    camera.mockResolvedValue(chosen(asset(400, 400, 80 * KB)));

    await pickProfilePhoto("camera");

    expect(permission).toHaveBeenCalled();
    expect(camera).toHaveBeenCalledWith(expect.objectContaining({ aspect: [1, 1] }));
  });

  it("is made 512 wide, when it is big, to stay small", async () => {
    library.mockResolvedValue(chosen(asset(2000, 2000, 900 * KB)));

    const result = await pickProfilePhoto("library");

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///cache/pick-2000.jpg",
      [{ resize: { width: 512 } }],
      expect.objectContaining({ format: "jpeg" })
    );
    expect(result).toMatchObject({ width: 512 });
  });

  it("is kept as it is when it is under 150 KB, though a piano photo may be up to 500 KB", async () => {
    library.mockResolvedValue(chosen(asset(480, 480, 140 * KB)));
    await pickProfilePhoto("library");
    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();

    library.mockResolvedValue(chosen(asset(480, 480, 200 * KB)));
    await pickProfilePhoto("library");
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
  });

  it("is nothing when the person closes the picker", async () => {
    library.mockResolvedValue({ canceled: true, assets: null } as any);

    await expect(pickProfilePhoto("library")).resolves.toBeNull();
  });

  it("is refused, with a message, when it is too small", async () => {
    library.mockResolvedValue(chosen(asset(40, 40, 3 * KB)));

    await expect(pickProfilePhoto("library")).resolves.toBeNull();

    expect(Alert.alert).toHaveBeenCalledWith("Image Too Small", expect.stringContaining("40x40"));
  });

  it("asks the screen to explain when the camera is refused, and doesn't open it", async () => {
    permission.mockResolvedValue({ granted: false } as any);
    const denied = jest.fn();

    await expect(pickProfilePhoto("camera", denied)).resolves.toBeNull();

    expect(denied).toHaveBeenCalledTimes(1);
    expect(camera).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("says in an alert, about a profile photo, when the camera is refused and nothing else explains", async () => {
    permission.mockResolvedValue({ granted: false } as any);

    await pickProfilePhoto("camera");

    expect(Alert.alert).toHaveBeenCalledWith(
      "Camera Access Needed",
      "Allow Pianoverse to use the camera in your phone's settings to take a profile photo."
    );
  });
});

describe("a piano photo, as before", () => {
  it("is cropped to 4:3 and scaled to 1600 wide", async () => {
    library.mockResolvedValue(chosen(asset(4000, 3000, 6 * 1024 * KB)));

    await pickPianoPhoto("library");

    expect(library).toHaveBeenCalledWith(expect.objectContaining({ aspect: [4, 3] }));
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      expect.any(String),
      [{ resize: { width: 1600 } }],
      expect.anything()
    );
  });

  it("is kept as it is up to 500 KB", async () => {
    library.mockResolvedValue(chosen(asset(1200, 900, 400 * KB)));

    await pickPianoPhoto("library");

    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
  });

  it("says in an alert, about pianos, when the camera is refused and nothing else explains", async () => {
    permission.mockResolvedValue({ granted: false } as any);

    await pickPianoPhoto("camera");

    expect(Alert.alert).toHaveBeenCalledWith(
      "Camera Access Needed",
      "Allow Pianoverse to use the camera in your phone's settings to take photos of pianos."
    );
  });
});
