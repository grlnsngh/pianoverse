import { PianoItem } from "@/redux/pianos/types";
import { fileViewUrl } from "./fakeAppwrite";

export const testUser = {
  $id: "user-doc-1",
  accountId: "account-1",
  username: "tester",
  email: "tester@example.com",
  avatar: "",
};

export const otherUser = {
  $id: "user-doc-2",
  accountId: "account-2",
  username: "someone",
  email: "someone@example.com",
  avatar: "",
};

export const makePiano = (overrides: Partial<PianoItem> = {}): PianoItem =>
  ({
    $id: "piano-1",
    $collectionId: "pianos",
    $databaseId: "db",
    $permissions: [],
    $tenant: "",
    $createdAt: "2026-09-01T10:00:00.000+00:00",
    $updatedAt: "2026-09-01T10:00:00.000+00:00",
    category: "warehouse",
    creator: testUser.accountId,
    users: testUser as any,
    title: "Yamaha U1",
    make: "Other",
    description: "Upright piano",
    company_associated: "Shamshersons",
    image_url: fileViewUrl("old-file"),
    date_of_purchase: "2026-01-15T00:00:00.000+00:00" as any,
    warehouse_since_date: "2026-02-01T00:00:00.000+00:00" as any,
    ...overrides,
  }) as PianoItem;
