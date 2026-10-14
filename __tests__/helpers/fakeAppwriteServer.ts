/**
 * In-memory stand-in for the parts of node-appwrite the delete-account
 * function uses: TablesDB (listRows, deleteRow), Storage (listFiles,
 * deleteFile) and Users (list, delete), with the same object parameters.
 *
 * Like the server, lists honour equal(), startsWith(), limit() (25 without
 * one) and cursorAfter(); a table that doesn't exist, and a row, file or user
 * that is already gone, answer 404. `log` records each deletion in order.
 * Queries are written with the real Query of the app's SDK, which makes the
 * same strings as node-appwrite's.
 */
const { Query } = jest.requireActual("react-native-appwrite");

export { Query };

type Row = Record<string, any> & { $id: string };
type StoredFile = { $id: string; name: string };
type User = { $id: string; email: string; name: string; $createdAt: string };

export const notFound = (type: string) =>
  Object.assign(new Error(`Not found: ${type}`), { code: 404, type });

const filtered = <T extends Record<string, any>>(items: T[], queries: string[] = []) => {
  const parsed = queries.map((query) => JSON.parse(query));
  let result = items.filter((item) =>
    parsed.every((query) => {
      if (query.method === "equal") return query.values.includes(item[query.attribute]);
      if (query.method === "startsWith") return String(item[query.attribute]).startsWith(query.values[0]);
      return true;
    })
  );
  const after = parsed.find((query) => query.method === "cursorAfter");
  if (after) result = result.slice(result.findIndex((item) => item.$id === after.values[0]) + 1);
  const limit = parsed.find((query) => query.method === "limit")?.values[0] ?? 25;
  return result.slice(0, limit);
};

export const createFakeServer = (tableIds: string[]) => {
  const tables = new Map<string, Row[]>(tableIds.map((id) => [id, []]));
  const files: StoredFile[] = [];
  const accounts: User[] = [];
  const log: string[] = [];

  const tablesDB = {
    listRows: jest.fn(async ({ tableId, queries }: { tableId: string; queries?: string[] }) => {
      const rows = tables.get(tableId);
      if (!rows) throw notFound("table_not_found");
      return { total: rows.length, rows: filtered(rows, queries) };
    }),
    deleteRow: jest.fn(async ({ tableId, rowId }: { tableId: string; rowId: string }) => {
      const rows = tables.get(tableId);
      const index = rows?.findIndex((row) => row.$id === rowId) ?? -1;
      if (!rows || index < 0) throw notFound("row_not_found");
      rows.splice(index, 1);
      log.push(`row ${tableId}/${rowId}`);
      return {};
    }),
  };

  const storage = {
    listFiles: jest.fn(async ({ queries }: { bucketId: string; queries?: string[] }) => ({
      total: files.length,
      files: filtered(files, queries),
    })),
    deleteFile: jest.fn(async ({ fileId }: { bucketId: string; fileId: string }) => {
      const index = files.findIndex((file) => file.$id === fileId);
      if (index < 0) throw notFound("storage_file_not_found");
      files.splice(index, 1);
      log.push(`file ${fileId}`);
      return {};
    }),
  };

  const users = {
    list: jest.fn(async ({ queries }: { queries?: string[] } = {}) => ({
      total: accounts.length,
      users: filtered(accounts, queries),
    })),
    delete: jest.fn(async ({ userId }: { userId: string }) => {
      const index = accounts.findIndex((user) => user.$id === userId);
      if (index < 0) throw notFound("user_not_found");
      accounts.splice(index, 1);
      log.push(`user ${userId}`);
      return {};
    }),
  };

  return {
    tables,
    files,
    accounts,
    log,
    tablesDB,
    storage,
    users,
    addRow: (tableId: string, row: Row) => tables.get(tableId)!.push(row),
    addFile: (file: StoredFile) => files.push(file),
    addAccount: (user: User) => accounts.push(user),
  };
};

export type FakeServer = ReturnType<typeof createFakeServer>;
