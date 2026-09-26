/**
 * In-memory stand-in for the parts of `react-native-appwrite` the app uses.
 *
 * It mirrors the real SDK/server behaviour these tests depend on:
 *  - `listDocuments` returns at most 25 documents unless a `limit()` query is given
 *  - `equal()`, `orderDesc()`, `limit()` and `cursorAfter()` queries are honoured
 *  - `storage.createFile` resolves to `undefined` when `file.size` is not a number,
 *    because the real SDK skips its upload loop in that case
 *
 * `Query` and `ID` are the real SDK implementations, so query strings are genuine.
 */
const sdk = jest.requireActual("react-native-appwrite");

export const ENDPOINT = "https://cloud.appwrite.io/v1";
export const PROJECT_ID = "66b2693000154e2fa3c8";
export const BUCKET_ID = "66b26b77003445e612b4";

type StoredFile = { name: string; type: string; size: number; uri: string };
type Doc = Record<string, any> & { $id: string; $createdAt: string };

export const fakeBackend = {
  documents: new Map<string, Doc>(),
  files: new Map<string, StoredFile>(),
  listCalls: [] as string[][],
  failNextDocumentUpdate: false,
  reset() {
    this.documents.clear();
    this.files.clear();
    this.listCalls = [];
    this.failNextDocumentUpdate = false;
  },
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
  async listDocuments(_databaseId: string, _collectionId: string, queries: string[] = []) {
    fakeBackend.listCalls.push(queries);
    const parsed = queries.map((query) => JSON.parse(query));

    let docs = [...fakeBackend.documents.values()];
    for (const query of parsed) {
      if (query.method === "equal") {
        docs = docs.filter((doc) => query.values.includes(doc[query.attribute]));
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

  async createDocument(_databaseId: string, _collectionId: string, id: string, data: object) {
    const doc = { ...data, $id: id, $createdAt: new Date().toISOString() };
    fakeBackend.documents.set(id, doc);
    return doc;
  }

  async updateDocument(_databaseId: string, _collectionId: string, id: string, data: object) {
    if (fakeBackend.failNextDocumentUpdate) {
      fakeBackend.failNextDocumentUpdate = false;
      throw new Error("Network request failed");
    }
    const existing = fakeBackend.documents.get(id);
    if (!existing) throw new Error("Document with the requested ID could not be found.");
    const updated = { ...existing, ...JSON.parse(JSON.stringify(data)) };
    fakeBackend.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(_databaseId: string, _collectionId: string, id: string) {
    if (!fakeBackend.documents.delete(id)) {
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

class Account {
  get = jest.fn();
  create = jest.fn();
  createEmailPasswordSession = jest.fn();
  deleteSession = jest.fn();
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
