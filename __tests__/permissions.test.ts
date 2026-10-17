import fs from "fs";
import path from "path";

/**
 * Every permission the Android app asks for is listed on Google Play, and some
 * must be explained there. These two come with packages the app uses, not with
 * anything it does, so app.json leaves them out.
 */
const { expo } = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "app.json"), "utf8"));
const plugin = (name: string) =>
  expo.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === name)?.[1];

describe("the Android permissions", () => {
  it("leave out the microphone: the camera only takes photos, never video", () => {
    expect(plugin("expo-image-picker").microphonePermission).toBe(false);
  });

  it("leave out the microphone and recording sound for the label scanner too: it only reads codes", () => {
    expect(plugin("expo-camera")).toMatchObject({ microphonePermission: false, recordAudioAndroid: false });
  });

  it("say why the camera is wanted to scan labels, in the words the phone shows", () => {
    expect(plugin("expo-camera").cameraPermission).toBe("Pianoverse uses the camera to scan the labels on your pianos.");
  });

  it("leave out drawing over other apps, which only React Native's tools in a development build use", () => {
    expect(expo.android.blockedPermissions).toContain("android.permission.SYSTEM_ALERT_WINDOW");
  });
});
