import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadAppearance, saveAppearance } from "@/lib/appearanceStorage";

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the saved appearance", () => {
  it("matches the phone when nothing was saved", async () => {
    expect(await loadAppearance()).toBe("system");
  });

  it("remembers dark and light", async () => {
    expect(await saveAppearance("dark")).toBe(true);
    expect(await loadAppearance()).toBe("dark");

    expect(await saveAppearance("light")).toBe(true);
    expect(await loadAppearance()).toBe("light");
  });

  it("keeps nothing for matching the phone, which is what no value means", async () => {
    await saveAppearance("dark");
    expect(await saveAppearance("system")).toBe(true);

    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect(await loadAppearance()).toBe("system");
  });

  it("ignores a value that isn't one of the three", async () => {
    await AsyncStorage.setItem("appearance:setting", "purple");

    expect(await loadAppearance()).toBe("system");
  });

  it("falls back to matching the phone, and says why, when the phone can't be read", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("disk"));

    expect(await loadAppearance()).toBe("system");
    expect(console.warn).toHaveBeenCalledWith(
      "Could not read the appearance setting:",
      expect.any(Error)
    );
  });

  it("says it wasn't saved, rather than failing, when the phone can't be written", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("full"));

    expect(await saveAppearance("dark")).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      "Could not save the appearance setting:",
      expect.any(Error)
    );
  });
});
