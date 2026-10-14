import fs from "fs";
import path from "path";

/**
 * Photo uploads go through the Appwrite SDK, which hands fetch a React Native
 * form part ({ uri, name, type }). Expo's own fetch, the default since SDK 56,
 * can't send those, so the app keeps React Native's: a setting in .env that
 * Expo reads whenever it bundles the app.
 */
describe("the fetch the app uses", () => {
  it("is React Native's, so photos can be uploaded", () => {
    const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");

    expect(env).toMatch(/^EXPO_PUBLIC_USE_RN_FETCH=1$/m);
  });
});
