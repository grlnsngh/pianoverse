/**
 * Stand-in for `expo-image-manipulator`'s contextual API (`ImageManipulator.manipulate(uri)`,
 * then `resize`, `renderAsync` and `saveAsync`):
 *
 *   jest.mock("expo-image-manipulator", () =>
 *     require("./helpers/fakeImageManipulator").createFakeImageManipulatorModule()
 *   );
 *
 * Every picture made ends in one call of `manipulateAsync(uri, actions, saveOptions)`,
 * the shape of the old API, so a test says what the picture comes out as with
 * `mockResolvedValue` and checks what was asked of it with `toHaveBeenCalledWith`.
 */
type Action = { resize: { width: number } };

export const createFakeImageManipulatorModule = () => {
  const manipulateAsync = jest.fn(
    async (_uri: string, _actions: Action[], _saveOptions: { compress?: number; format?: string }) =>
      ({}) as { uri: string; width: number; height: number }
  );
  const released = { contexts: 0, images: 0 };

  const manipulate = (uri: string) => {
    const actions: Action[] = [];
    const context = {
      resize: (size: { width: number }) => {
        actions.push({ resize: { width: size.width } });
        return context;
      },
      renderAsync: async () => ({
        saveAsync: (options: { compress?: number; format?: string }) => manipulateAsync(uri, actions, options),
        release: () => {
          released.images += 1;
        },
      }),
      release: () => {
        released.contexts += 1;
      },
    };
    return context;
  };

  return {
    ImageManipulator: { manipulate },
    SaveFormat: { JPEG: "jpeg", PNG: "png" },
    manipulateAsync,
    released,
  };
};

/** How many contexts and saved pictures were released, which is how the phone gets its memory back. */
export const releasedPictures = (): { contexts: number; images: number } =>
  jest.requireMock("expo-image-manipulator").released;
