jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn(), addListener: jest.fn(() => jest.fn()) })),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => {
  const context = {
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  };
  return { useGlobalContext: () => context };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act } from "react-test-renderer";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Profile from "@/app/(tabs)/profile";
import DeleteAccountSheet from "@/components/DeleteAccountSheet";
import { PRIVACY_POLICY_URL } from "@/constants/links";
import { useGlobalContext } from "@/context/GlobalProvider";
import { appwriteConfig, deleteAccount } from "@/lib/appwrite";
import { loadPianosFromCache, savePianosToCache } from "@/lib/pianoCache";
import { accountDeleted, fakeAccount, fakeBackend, fakeFunctions } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureToasts,
  createTestStore,
  findButton,
  flushPromises,
  pressLabel,
  pressText,
  renderWithStore,
} from "./helpers/render";

/**
 * Deleting the account (Account, Privacy, Delete account) and opening the
 * privacy policy, which Google Play asks every app with accounts to offer.
 */

const answer = (status: string, code: number, body: unknown) =>
  Promise.resolve({
    status,
    responseStatusCode: code,
    responseBody: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  fakeBackend.reset();
  fakeNotifications.reset();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("deleteAccount()", () => {
  it("asks the delete-account function, with a POST that confirms it, and waits for it", async () => {
    await deleteAccount();

    expect(fakeFunctions.createExecution).toHaveBeenCalledWith(
      appwriteConfig.deleteAccountFunctionId,
      JSON.stringify({ confirm: "DELETE" }),
      false,
      "/",
      "POST"
    );
  });

  it("gives the function's own message when it couldn't finish", async () => {
    fakeFunctions.createExecution.mockImplementationOnce(() =>
      answer("completed", 500, { ok: false, message: "Your account couldn't be deleted. Try again in a moment." })
    );

    await expect(deleteAccount()).rejects.toThrow("Your account couldn't be deleted. Try again in a moment.");
  });

  it("says to check the connection when the function can't be reached, or isn't there", async () => {
    const message = "Your account couldn't be deleted. Check your connection and try again.";
    fakeFunctions.createExecution.mockRejectedValueOnce(new Error("Network request failed"));
    await expect(deleteAccount()).rejects.toThrow(message);

    fakeFunctions.createExecution.mockRejectedValueOnce(
      Object.assign(new Error("Function with the requested ID could not be found."), { code: 404 })
    );
    await expect(deleteAccount()).rejects.toThrow(message);
  });

  it("doesn't take a run that failed or timed out for a deletion", async () => {
    for (const run of [
      answer("failed", 500, "Execution timed out."),
      answer("completed", 200, "not json"),
      answer("completed", 200, { ok: false }),
    ]) {
      fakeFunctions.createExecution.mockImplementationOnce(() => run);
      await expect(deleteAccount()).rejects.toThrow(/couldn't be deleted/);
    }
  });
});

describe("the Privacy group on Account", () => {
  const renderAccount = async (items = [makePiano({ $id: "p1" }), makePiano({ $id: "p2" })]) => {
    const store = createTestStore({ user: testUser, items });
    const renderer = renderWithStore(<Profile />, store);
    await flushPromises();
    return { store, renderer };
  };
  const sheet = (renderer: any) => renderer.root.findByType(DeleteAccountSheet);

  it("has the privacy policy and Delete account, above Sign out", async () => {
    const { renderer } = await renderAccount();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Privacy");
    expect(texts).toContain("Privacy policy");
    expect(texts).toContain("Delete account");
    expect(texts.indexOf("Delete account")).toBeLessThan(texts.indexOf("Sign out"));
  });

  it("opens the privacy policy in the browser", async () => {
    const { renderer } = await renderAccount();

    await pressLabel(renderer.root, "Privacy policy. What Pianoverse keeps about you, and why");

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });

  it("says where the privacy policy is when no browser opens", async () => {
    const toasts = captureToasts();
    jest.mocked(WebBrowser.openBrowserAsync).mockRejectedValueOnce(new Error("No browser"));
    const { renderer } = await renderAccount();

    await pressLabel(renderer.root, "Privacy policy. What Pianoverse keeps about you, and why");

    expect(toasts).toEqual([`Couldn't open the privacy policy. It's at ${PRIVACY_POLICY_URL}`]);
  });

  const openSheet = async () => {
    const result = await renderAccount();
    await pressLabel(result.renderer.root, "Delete account. Your account, pianos, photos and payments, for good");
    return result;
  };

  it("asks first, saying everything that goes and how to keep a copy", async () => {
    const { renderer } = await openSheet();

    expect(sheet(renderer).props.visible).toBe(true);
    const texts = allTexts(renderer.root).join(" ");
    expect(texts).toContain("Delete your account?");
    expect(texts).toContain("your 2 pianos and their photos, rent payments, rental history and customers");
    expect(texts).toContain("It can’t be undone.");
    expect(texts).toContain("download your piano list and payments under Your data first");
    expect(fakeFunctions.createExecution).not.toHaveBeenCalled();
  });

  it("deletes nothing when cancelled", async () => {
    const { renderer } = await openSheet();

    await pressText(renderer.root, "Cancel");

    expect(sheet(renderer).props.visible).toBe(false);
    expect(fakeFunctions.createExecution).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("deletes the account, clears this phone and goes back to the start", async () => {
    const toasts = captureToasts();
    await savePianosToCache(testUser.accountId, [makePiano()]);
    const { renderer } = await openSheet();

    await act(async () => {
      await findButton(renderer.root, "Delete account").props.onPress();
    });
    await flushPromises();

    const { setUser, setIsLogged } = useGlobalContext() as any;
    expect(fakeFunctions.createExecution).toHaveBeenCalledTimes(1);
    expect(await loadPianosFromCache(testUser.accountId)).toBeNull();
    expect(fakeNotifications.scheduled).toEqual([]);
    expect(setUser).toHaveBeenCalledWith(null);
    expect(setIsLogged).toHaveBeenCalledWith(false);
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(toasts).toContain("Your account and everything in it have been deleted.");
  });

  it("shows Deleting on the red button, and can't be cancelled, until it has finished", async () => {
    let finish: () => void = () => {};
    fakeFunctions.createExecution.mockImplementationOnce(
      () => new Promise((resolve) => (finish = () => resolve(accountDeleted())))
    );
    const { renderer } = await openSheet();

    await act(async () => {
      void findButton(renderer.root, "Delete account").props.onPress();
    });

    expect(sheet(renderer).props.deleting).toBe(true);
    expect(allTexts(renderer.root)).toContain("Deleting");

    await act(async () => finish());
    await flushPromises();
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("keeps everything, and the sheet open to try again, when the deletion fails", async () => {
    const toasts = captureToasts();
    await savePianosToCache(testUser.accountId, [makePiano()]);
    fakeFunctions.createExecution.mockImplementationOnce(() =>
      answer("completed", 500, { ok: false, message: "Your account couldn't be deleted. Try again in a moment." })
    );
    const { renderer } = await openSheet();

    await act(async () => {
      await findButton(renderer.root, "Delete account").props.onPress();
    });
    await flushPromises();

    expect(toasts).toEqual(["Your account couldn't be deleted. Try again in a moment."]);
    expect(sheet(renderer).props.visible).toBe(true);
    expect(sheet(renderer).props.deleting).toBe(false);
    expect(await loadPianosFromCache(testUser.accountId)).not.toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
    expect(fakeAccount.deleteSession).not.toHaveBeenCalled();
  });
});

describe("the sheet's words", () => {
  it("counts the pianos that go with the account", () => {
    const words = (pianoCount: number) =>
      allTexts(
        renderWithStore(
          <DeleteAccountSheet visible deleting={false} pianoCount={pianoCount} onConfirm={() => {}} onClose={() => {}} />,
          createTestStore()
        ).root
      ).join(" ");

    expect(words(1)).toContain("your piano and their photos");
    expect(words(3)).toContain("your 3 pianos and their photos");
    expect(words(0)).toContain("your pianos and their photos");
  });
});
