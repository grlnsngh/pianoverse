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
 *  - pianos, rent payments and kept rentals live in separate collections, and a collection
 *    that does not exist yet (`missingCollections`) rejects every request
 *  - every write is checked against the live project's tables (appwrite/project.json,
 *    kept in step by `npm run check:appwrite`): a table ID that isn't there, a column
 *    it doesn't have, a missing required value, the wrong type or text that is too
 *    long is refused with Appwrite's message, as the real project would
 *
 * `Query` and `ID` are the real SDK implementations, so query strings are genuine.
 */
const sdk = jest.requireActual("react-native-appwrite");
const { loadProject, rowProblem } = jest.requireActual("../../scripts/appwriteSchema");

/** The live project's tables, as appwrite/project.json records them. */
const PROJECT = loadProject();

export const ENDPOINT = "https://cloud.appwrite.io/v1";
export const PROJECT_ID = "66b2693000154e2fa3c8";
export const BUCKET_ID = "66b26b77003445e612b4";
export const PAYMENTS_COLLECTION_ID = "rent_payments";
// Named rental_history in the console; it was made with an ID of its own
export const RENTAL_HISTORY_COLLECTION_ID = "6abdffe40034432a5cde";
export const SERVICE_LOG_COLLECTION_ID = "service_log";
export const EXPENSES_COLLECTION_ID = "expenses";

type StoredFile = { name: string; type: string; size: number; uri: string };
type Doc = Record<string, any> & { $id: string; $createdAt: string };

export const fakeBackend = {
  // Pianos
  documents: new Map<string, Doc>(),
  payments: new Map<string, Doc>(),
  // Rentals that are over (the rental_history table)
  history: new Map<string, Doc>(),
  // Tunings, repairs and the rest (the service_log table)
  service: new Map<string, Doc>(),
  // Business expenses (the expenses table)
  expenses: new Map<string, Doc>(),
  missingCollections: new Set<string>(),
  // Columns the tables don't have (yet): a document that uses one is rejected
  unknownColumns: new Set<string>(),
  files: new Map<string, StoredFile>(),
  listCalls: [] as string[][],
  // The table each list was of, in the same order as `listCalls`
  listCollections: [] as string[],
  failNextDocumentUpdate: false,
  signOutError: null as Error | null,
  reset() {
    this.documents.clear();
    this.payments.clear();
    this.history.clear();
    this.service.clear();
    this.expenses.clear();
    this.missingCollections.clear();
    this.unknownColumns.clear();
    this.files.clear();
    this.listCalls = [];
    this.listCollections = [];
    this.failNextDocumentUpdate = false;
    this.signOutError = null;
    fakeAccount.get.mockReset();
    fakeAccount.createEmailPasswordSession.mockReset();
    fakeAccount.deleteSession.mockReset().mockImplementation(deleteSessionAsUsual);
    fakeAccount.createOAuth2Token.mockReset().mockImplementation(googleLoginUrl);
    fakeAccount.createSession.mockReset();
    fakeAccount.createJWT.mockReset().mockResolvedValue({ jwt: "test-jwt" });
    fakeAccount.listIdentities.mockReset().mockResolvedValue({ total: 0, identities: [] });
    fakeFunctions.createExecution.mockReset().mockImplementation(accountDeleted);
  },
};

/** The table in the live project, or Appwrite's error when there is none with that ID. */
const tableFor = (collectionId: string) => {
  const table = PROJECT.tables.find((candidate: { $id: string }) => candidate.$id === collectionId);
  if (!table || fakeBackend.missingCollections.has(collectionId)) {
    throw new Error("Collection with the requested ID could not be found.");
  }
  return table;
};

const storeFor = (collectionId: string) => {
  tableFor(collectionId);
  if (collectionId === PAYMENTS_COLLECTION_ID) return fakeBackend.payments;
  if (collectionId === RENTAL_HISTORY_COLLECTION_ID) return fakeBackend.history;
  if (collectionId === SERVICE_LOG_COLLECTION_ID) return fakeBackend.service;
  if (collectionId === EXPENSES_COLLECTION_ID) return fakeBackend.expenses;
  return fakeBackend.documents;
};

/** What the SDK sends: the data as JSON (a URL becomes its text, a Date its ISO time). */
const asSent = (data: object): Record<string, unknown> => JSON.parse(JSON.stringify(data));

/** Refuses what the live table would refuse, with Appwrite's message. */
const checkRow = (collectionId: string, data: Record<string, unknown>, creating: boolean) => {
  for (const column of Object.keys(data)) {
    if (fakeBackend.unknownColumns.has(column)) {
      throw new Error(`Invalid document structure: Unknown attribute: "${column}"`);
    }
  }
  const problem = rowProblem(tableFor(collectionId), data, { creating });
  if (problem) throw new Error(problem);
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
    fakeBackend.listCollections.push(collectionId);
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
    checkRow(collectionId, asSent(data), true);
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
    checkRow(collectionId, asSent(data), false);
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

/** The page Appwrite would send the person to for Google, as the SDK builds it. */
const googleLoginUrl = (provider: string, success?: string, failure?: string) =>
  new URL(
    `${ENDPOINT}/account/tokens/oauth2/${provider}?project=test&success=${encodeURIComponent(
      success ?? ""
    )}&failure=${encodeURIComponent(failure ?? "")}`
  );

const deleteSessionAsUsual = async () => {
  if (fakeBackend.signOutError) throw fakeBackend.signOutError;
  return {};
};

/**
 * The account calls, shared by every Account the app creates so tests can
 * say what they answer (e.g. who is signed in). Reset with the backend.
 */
export const fakeAccount: Record<
  | "get"
  | "createEmailPasswordSession"
  | "deleteSession"
  | "createOAuth2Token"
  | "createSession"
  | "createJWT"
  | "listIdentities",
  jest.Mock
> = {
  get: jest.fn(),
  createEmailPasswordSession: jest.fn(),
  deleteSession: jest.fn(deleteSessionAsUsual),
  createOAuth2Token: jest.fn(googleLoginUrl),
  createSession: jest.fn(),
  // The token photos are loaded with (lib/photoAuth.ts)
  createJWT: jest.fn(() => Promise.resolve({ jwt: "test-jwt" })),
  listIdentities: jest.fn(() => Promise.resolve({ total: 0, identities: [] })),
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
  createOAuth2Token = (...args: unknown[]) => fakeAccount.createOAuth2Token(...args);
  createSession = (...args: unknown[]) => fakeAccount.createSession(...args);
  createJWT = (...args: unknown[]) => fakeAccount.createJWT(...args);
  listIdentities = (...args: unknown[]) => fakeAccount.listIdentities(...args);
  createRecovery = jest.fn();
  updateRecovery = jest.fn();
}

/**
 * What the delete-account Appwrite Function answers: by default, that the
 * account was deleted. Tests can make it answer otherwise. Reset with the backend.
 */
export const accountDeleted = () =>
  Promise.resolve({
    status: "completed",
    responseStatusCode: 200,
    responseBody: JSON.stringify({
      ok: true,
      deleted: { pianos: 1, payments: 0, rentals: 0, photos: 1, profiles: 1 },
    }),
  });

export const fakeFunctions = {
  createExecution: jest.fn(accountDeleted) as jest.Mock,
};

class Functions {
  createExecution = (...args: unknown[]) => (fakeFunctions.createExecution as jest.Mock)(...args);
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
  Functions,
  ExecutionMethod: sdk.ExecutionMethod,
  Query: sdk.Query,
  ID: sdk.ID,
  OAuthProvider: sdk.OAuthProvider,
});
