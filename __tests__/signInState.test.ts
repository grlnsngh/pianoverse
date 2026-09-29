jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import { getCurrentUser } from "@/lib/appwrite";
import {
  appwriteError,
  fakeAccount,
  fakeBackend,
} from "./helpers/fakeAppwrite";
import { testUser } from "./helpers/fixtures";

beforeEach(() => {
  fakeBackend.reset();
});

const signedInAs = (accountId: string) =>
  fakeAccount.get.mockResolvedValue({ $id: accountId });

describe("finding out who is signed in", () => {
  it("is the user's document when someone is signed in", async () => {
    fakeBackend.documents.set(testUser.$id, {
      ...testUser,
      $createdAt: "2026-01-01T00:00:00.000+00:00",
    });
    signedInAs(testUser.accountId);

    await expect(getCurrentUser()).resolves.toMatchObject({
      $id: testUser.$id,
      accountId: testUser.accountId,
    });
  });

  it("is nobody when Appwrite says so", async () => {
    fakeAccount.get.mockRejectedValue(
      appwriteError(
        "User (role: guests) missing scope (account)",
        401,
        "general_unauthorized_scope"
      )
    );

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("is nobody when the account has no user document", async () => {
    signedInAs("account-without-document");

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("is unknown, not nobody, when Appwrite can't be reached", async () => {
    fakeAccount.get.mockRejectedValue(
      appwriteError("Network request failed")
    );

    await expect(getCurrentUser()).rejects.toThrow("Network request failed");
  });
});

