/**
 * In-memory stand-in for the parts of `react-native-appwrite` the app uses.
 *
 * It mirrors the real SDK/server behaviour these tests depend on:
 *  - `listDocuments` returns at most 25 documents unless a `limit()` query is given
 *  - `equal()`, `greaterThanEqual()`, `lessThan()`, `orderDesc()`, `limit()` and
 *    `cursorAfter()` queries are honoured (dates are compared as dates)
 *  - `storage.createFile` resolves to `undefined` when `file.size` is not a number,
 *    because the real SDK skips its upload loop in that case
 *  - the price columns of the pianos collection are numbers (double) and the
 *    server rejects anything else, e.g. the text "185000"
 *  - pianos and rent payments live in separate collections, and a collection
 *    that does not exist yet (`missingCollections`) rejects every request
 *
 * `Query` and `ID` are the real SDK implementations, so query strings are genuine.
 */
const sdk = jest.requireActual("react-native-appwrite");

export const ENDPOINT = "https://cloud.appwrite.io/v1";
export const PROJECT_ID = "66b2693000154e2fa3c8";
export const BUCKET_ID = "66b26b77003445e612b4";
export const PAYMENTS_COLLECTION_ID = "rent_payments";

type StoredFile = { name: string; type: string; size: number; uri: string };
type Doc = Record<string, any> & { $id: string; $createdAt: string };

export const fakeBackend = {
  // Pianos
  documents: new Map<string, Doc>(),
  payments: new Map<string, Doc>(),
  missingCollections: new Set<string>(),
  files: new Map<string, StoredFile>(),
  listCalls: [] as string[][],
  failNextDocumentUpdate: false,
  signOutError: null as Error | null,
  reset() {
    this.documents.clear();
    this.payments.clear();
    this.missingCollections.clear();
    this.files.clear();
    this.listCalls = [];
    this.failNextDocumentUpdate = false;
    this.signOutError = null;
    fakeAccount.get.mockReset();
    fakeAccount.createEmailPasswordSession.mockReset();
    fakeAccount.deleteSession.mockReset().mockImplementation(deleteSessionAsUsual);
  },
};

// Columns the collections store as `double`
const NUMBER_COLUMNS = [
  "rental_price",
  "event_purchase_price",
  "on_sale_price",
  "sold_price",
  "amount",
];

const storeFor = (collectionId: string) => {
  if (fakeBackend.missingCollections.has(collectionId)) {
    throw new Error("Collection with the requested ID could not be found.");
  }
  return collectionId === PAYMENTS_COLLECTION_ID
    ? fakeBackend.payments
    : fakeBackend.documents;
};

const rejectNonNumbers = (data: Record<string, unknown>) => {
  for (const column of NUMBER_COLUMNS) {
    const value = data[column];
    if (value !== undefined && value !== null && typeof value !== "number") {
      throw new Error(
        `Invalid document structure: Attribute "${column}" has invalid type. Value must be a valid float`
      );
    }
  }
};

export const fileViewUrl = (fileId: string) =>
  `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;

class Client {
  config = { endpoint: "", project: "" };
  setEndpoint(endpoint: string) {
    this.config.endpoint = endpoint;
    return this;
  }
  setProject(project: string) {
    this.config.project = project;
    return this;
  }
  setPlatform() {
    return this;
  }
}

class Databases {
  async listDocuments(_databaseId: string, collectionId: string, queries: string[] = []) {
    fakeBackend.listCalls.push(queries);
    const parsed = queries.map((query) => JSON.parse(query));

    let docs = [...storeFor(collectionId).values()];
    for (const query of parsed) {
      if (query.method === "equal") {
        docs = docs.filter((doc) => query.values.includes(doc[query.attribute]));
      }
      if (query.method === "greaterThanEqual") {
        docs = docs.filter(
          (doc) => Date.parse(doc[query.attribute]) >= Date.parse(query.values[0])
        );
      }
      if (query.method === "lessThan") {
        docs = docs.filter(
          (doc) => Date.parse(doc[query.attribute]) < Date.parse(query.values[0])
        );
      }
    }

    const order = parsed.find((query) => query.method === "orderDesc");
    if (order) {
      docs.sort((a, b) =>
        a[order.attribute] === b[order.attribute]
          ? b.$id.localeCompare(a.$id)
          : b[order.attribute].localeCompare(a[order.attribute])
      );
    }

    const total = docs.length;
    const cursor = parsed.find((query) => query.method === "cursorAfter");
    if (cursor) {
      const index = docs.findIndex((doc) => doc.$id === cursor.values[0]);
      if (index === -1) {
        throw new Error(`Document with the requested ID '${cursor.values[0]}' could not be found.`);
      }
      docs = docs.slice(index + 1);
    }

    const limit = parsed.find((query) => query.method === "limit")?.values[0] ?? 25;
    return { total, documents: docs.slice(0, limit) };
  }

  async createDocument(_databaseId: string, collectionId: string, id: string, data: object) {
    const store = storeFor(collectionId);
    rejectNonNumbers(data as Record<string, unknown>);
    const doc = { ...data, $id: id, $createdAt: new Date().toISOString() };
    store.set(id, doc);
    return doc;
  }

  async updateDocument(_databaseId: string, collectionId: string, id: string, data: object) {
    if (fakeBackend.failNextDocumentUpdate) {
      fakeBackend.failNextDocumentUpdate = false;
      throw new Error("Network request failed");
    }
    const store = storeFor(collectionId);
    const existing = store.get(id);
    if (!existing) throw new Error("Document with the requested ID could not be found.");
    rejectNonNumbers(data as Record<string, unknown>);
    const updated = { ...existing, ...JSON.parse(JSON.stringify(data)) };
    store.set(id, updated);
    return updated;
  }

  async deleteDocument(_databaseId: string, collectionId: string, id: string) {
    if (!storeFor(collectionId).delete(id)) {
      throw new Error("Document with the requested ID could not be found.");
    }
    return {};
  }
}

class Storage {
  constructor(private client: Client) {}

  async createFile(_bucketId: string, fileId: string, file: StoredFile) {
    // Real SDK: `if (size <= CHUNK_SIZE)` is false for undefined, and the chunk
    // loop `while (offset < size)` never runs, so it resolves to undefined.
    if (typeof file.size !== "number" || Number.isNaN(file.size)) return undefined;
    fakeBackend.files.set(fileId, { ...file });
    return { $id: fileId, name: file.name, mimeType: file.type, sizeOriginal: file.size };
  }

  getFileView(bucketId: string, fileId: string) {
    return new URL(
      `${this.client.config.endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${this.client.config.project}`
    );
  }

  async deleteFile(_bucketId: string, fileId: string) {
    if (!fakeBackend.files.delete(fileId)) {
      throw new Error("The requested file could not be found.");
    }
    return {};
  }
}

const deleteSessionAsUsual = async () => {
  if (fakeBackend.signOutError) throw fakeBackend.signOutError;
  return {};
};

/**
 * The account calls, shared by every Account the app creates so tests can
 * say what they answer (e.g. who is signed in). Reset with the backend.
 */
export const fakeAccount: Record<
  "get" | "createEmailPasswordSession" | "deleteSession",
  jest.Mock
> = {
  get: jest.fn(),
  createEmailPasswordSession: jest.fn(),
  deleteSession: jest.fn(deleteSessionAsUsual),
};

/** An error as the SDK throws it: `code` is the HTTP status, 0 when offline. */
export const appwriteError = (message: string, code = 0, type = "") =>
  Object.assign(new Error(message), { name: "AppwriteException", code, type });

class Account {
  get = (...args: unknown[]) => fakeAccount.get(...args);
  create = jest.fn();
  createEmailPasswordSession = (...args: unknown[]) =>
    fakeAccount.createEmailPasswordSession(...args);
  deleteSession = (...args: unknown[]) => fakeAccount.deleteSession(...args);
  createRecovery = jest.fn();
  updateRecovery = jest.fn();
}

class Avatars {
  getInitials(name: string) {
    return new URL(`${ENDPOINT}/avatars/initials?name=${encodeURIComponent(name)}`);
  }
}

export const createFakeAppwriteModule = () => ({
  __esModule: true,
  Client,
  Databases,
  Storage,
  Account,
  Avatars,
  Query: sdk.Query,
  ID: sdk.ID,
});
