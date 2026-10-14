import fs from "fs";
import path from "path";
import { createFakeServer, FakeServer, notFound, Query } from "./helpers/fakeAppwriteServer";

const config = require("../functions/delete-account/src/config");
const { deleteAccount, fileIdFromUrl, photoNamePrefix } = require(
  "../functions/delete-account/src/deleteAccount"
);

/**
 * The delete-account Appwrite Function (functions/delete-account), against an
 * in-memory Appwrite: what it deletes, what it leaves alone, and that a
 * deletion can be asked for again when one stopped half way.
 */

const ME = "acc_me";
const SOMEONE_ELSE = "acc_other";
const BUCKET = config.storageId;
const view = (fileId: string) =>
  `${config.endpoint}/storage/buckets/${BUCKET}/files/${fileId}/view?project=${config.projectId}`;
const TABLES = [
  config.userTableId,
  config.pianoTableId,
  config.rentPaymentsTableId,
  config.rentalHistoryTableId,
];

let server: FakeServer;

const seed = () => {
  server = createFakeServer(TABLES);
  server.addAccount({ $id: ME, email: "me@example.com", name: "Me", $createdAt: "2025-09-01" });
  server.addAccount({ $id: SOMEONE_ELSE, email: "x@example.com", name: "X", $createdAt: "2025-09-02" });
  server.addRow(config.userTableId, { $id: "u_me", accountId: ME, avatar: view("f_avatar") });
  server.addRow(config.userTableId, { $id: "u_other", accountId: SOMEONE_ELSE, avatar: view("f_theirs") });
  server.addRow(config.pianoTableId, {
    $id: "p1",
    creator: ME,
    image_url: view("f1"),
    image_urls: [view("f1"), view("f2")],
  });
  server.addRow(config.pianoTableId, { $id: "p2", creator: ME, image_url: "", image_urls: [] });
  server.addRow(config.pianoTableId, { $id: "p3", creator: SOMEONE_ELSE, image_url: view("f_theirs2") });
  server.addRow(config.rentPaymentsTableId, { $id: "pay1", creator: ME, piano_id: "p1" });
  server.addRow(config.rentPaymentsTableId, { $id: "pay2", creator: SOMEONE_ELSE, piano_id: "p3" });
  server.addRow(config.rentalHistoryTableId, { $id: "h1", creator: ME, piano_id: "p2" });
  for (const id of ["f1", "f2", "f_avatar"]) server.addFile({ $id: id, name: `${photoNamePrefix(ME)}itemTitle_x.jpg` });
  // A photo whose piano never got saved: only its name says whose it is
  server.addFile({ $id: "f_orphan", name: `${photoNamePrefix(ME)}itemTitle_lost.jpg` });
  server.addFile({ $id: "f_theirs", name: `${photoNamePrefix(SOMEONE_ELSE)}itemTitle_profile.jpg` });
  server.addFile({ $id: "f_theirs2", name: `${photoNamePrefix(SOMEONE_ELSE)}itemTitle_y.jpg` });
};

const run = (accountId = ME) =>
  deleteAccount({
    tablesDB: server.tablesDB,
    storage: server.storage,
    users: server.users,
    Query,
    config,
    accountId,
  });

const ids = (tableId: string) => server.tables.get(tableId)!.map((row) => row.$id);

beforeEach(seed);

describe("deleting an account", () => {
  it("deletes the person's payments, kept rentals, pianos, photos, profile and account", async () => {
    const deleted = await run();

    expect(ids(config.rentPaymentsTableId)).toEqual(["pay2"]);
    expect(ids(config.rentalHistoryTableId)).toEqual([]);
    expect(ids(config.pianoTableId)).toEqual(["p3"]);
    expect(ids(config.userTableId)).toEqual(["u_other"]);
    expect(server.files.map((file) => file.$id).sort()).toEqual(["f_theirs", "f_theirs2"]);
    expect(server.accounts.map((user) => user.$id)).toEqual([SOMEONE_ELSE]);
    expect(deleted).toEqual({ pianos: 2, payments: 1, rentals: 1, photos: 4, profiles: 1 });
  });

  it("deletes the account last, so a deletion that stops leaves the person able to ask again", async () => {
    await run();

    expect(server.log[server.log.length - 1]).toBe(`user ${ME}`);
    expect(server.log.filter((entry) => entry.startsWith("user"))).toHaveLength(1);
  });

  it("finishes the job when asked again after stopping half way", async () => {
    server.storage.deleteFile.mockRejectedValueOnce(new Error("Network request failed"));
    await expect(run()).rejects.toThrow("Network request failed");
    expect(server.accounts.map((user) => user.$id)).toContain(ME);

    await run();

    expect(ids(config.pianoTableId)).toEqual(["p3"]);
    expect(server.files.map((file) => file.$id).sort()).toEqual(["f_theirs", "f_theirs2"]);
    expect(server.accounts.map((user) => user.$id)).toEqual([SOMEONE_ELSE]);
  });

  it("skips what is already gone", async () => {
    await run();
    server.addAccount({ $id: ME, email: "me@example.com", name: "Me", $createdAt: "2025-09-01" });

    await expect(run()).resolves.toEqual({ pianos: 0, payments: 0, rentals: 0, photos: 0, profiles: 0 });
    expect(server.accounts.map((user) => user.$id)).toEqual([SOMEONE_ELSE]);
  });

  it("goes through more than one page of rows", async () => {
    for (let i = 0; i < 250; i++) {
      server.addRow(config.rentPaymentsTableId, { $id: `many${String(i).padStart(3, "0")}`, creator: ME });
    }

    const deleted = await run();

    expect(deleted.payments).toBe(251);
    expect(ids(config.rentPaymentsTableId)).toEqual(["pay2"]);
  });

  it("works when the owner hasn't made the rental_history table", async () => {
    server.tables.delete(config.rentalHistoryTableId);

    await expect(run()).resolves.toMatchObject({ rentals: 0, pianos: 2 });
    expect(server.accounts.map((user) => user.$id)).toEqual([SOMEONE_ELSE]);
  });

  it("still deletes the photos its pianos point to when the files can't be looked up by name", async () => {
    server.storage.listFiles.mockRejectedValueOnce(new Error("Invalid query: startsWith"));

    const deleted = await run();

    expect(deleted.photos).toBe(3);
    expect(server.files.map((file) => file.$id).sort()).toEqual(["f_orphan", "f_theirs", "f_theirs2"]);
  });

  it("stops, keeping the account, when Appwrite refuses a deletion", async () => {
    server.tablesDB.deleteRow.mockRejectedValueOnce(Object.assign(new Error("No permission"), { code: 401 }));

    await expect(run()).rejects.toThrow("No permission");
    expect(server.accounts.map((user) => user.$id)).toContain(ME);
  });

  it("refuses to run without an account", async () => {
    await expect(run("")).rejects.toThrow("No account to delete");
    expect(server.log).toEqual([]);
  });
});

describe("finding a photo's file", () => {
  it("reads the file ID of a view or preview URL in the app's bucket", () => {
    expect(fileIdFromUrl(view("abc123"), BUCKET)).toBe("abc123");
    expect(
      fileIdFromUrl(`${config.endpoint}/storage/buckets/${BUCKET}/files/xyz/preview?width=200`, BUCKET)
    ).toBe("xyz");
  });

  it("leaves alone Google photos, initials and other buckets", () => {
    expect(fileIdFromUrl("https://lh3.googleusercontent.com/a/photo=s400", BUCKET)).toBeNull();
    expect(fileIdFromUrl(`${config.endpoint}/avatars/initials?name=Me`, BUCKET)).toBeNull();
    expect(fileIdFromUrl(`${config.endpoint}/storage/buckets/other/files/abc/view`, BUCKET)).toBeNull();
    expect(fileIdFromUrl(undefined, BUCKET)).toBeNull();
  });

  it("names files the way the app's uploadFile does", () => {
    const appwrite = fs.readFileSync(path.join(__dirname, "..", "lib", "appwrite.ts"), "utf8");
    expect(appwrite).toContain("userId_${userId}_itemTitle_${itemTitle}_${timestamp}.${fileExtension}");
    expect(appwrite).toContain('input.replace(/[^a-zA-Z0-9-_]/g, "_")');
    expect(photoNamePrefix("a.b@c")).toBe("userId_a_b_c_");
  });
});

describe("the function itself", () => {
  const fakeSdk = () => ({
    Client: class {
      setEndpoint() {
        return this;
      }
      setProject() {
        return this;
      }
      setKey() {
        return this;
      }
    },
    TablesDB: class {
      constructor() {
        return server.tablesDB;
      }
    },
    Storage: class {
      constructor() {
        return server.storage;
      }
    },
    Users: class {
      constructor() {
        return server.users;
      }
    },
    Query,
  });

  let main: (context: any) => Promise<any>;
  beforeEach(() => {
    jest.resetModules();
    jest.doMock("node-appwrite", fakeSdk, { virtual: true });
    main = require("../functions/delete-account/src/main");
  });

  const call = async (request: Record<string, any>) => {
    const reply: { body?: any; status?: number } = {};
    const context = {
      req: { method: "POST", headers: {}, bodyText: "", ...request },
      res: {
        json: (body: any, status = 200) => {
          reply.body = body;
          reply.status = status;
          return reply;
        },
      },
      log: jest.fn(),
      error: jest.fn(),
    };
    await main(context);
    return { ...reply, error: context.error };
  };
  const signedIn = { "x-appwrite-user-id": ME, "x-appwrite-key": "dynamic-key" };
  const confirmed = JSON.stringify({ confirm: "DELETE" });

  it("deletes the account of whoever runs it, when asked to", async () => {
    const reply = await call({ headers: signedIn, bodyText: confirmed });

    expect(reply.status).toBe(200);
    expect(reply.body).toEqual({
      ok: true,
      deleted: { pianos: 2, payments: 1, rentals: 1, photos: 4, profiles: 1 },
    });
    expect(server.accounts.map((user) => user.$id)).toEqual([SOMEONE_ELSE]);
  });

  it("deletes nobody's account when nobody is signed in", async () => {
    const reply = await call({ bodyText: confirmed });

    expect(reply.status).toBe(401);
    expect(server.log).toEqual([]);
  });

  it("deletes nothing without the confirmation, or for anything but a POST", async () => {
    for (const request of [
      { headers: signedIn },
      { headers: signedIn, bodyText: "{not json" },
      { headers: signedIn, bodyText: JSON.stringify({ confirm: "yes" }) },
      { headers: signedIn, bodyText: confirmed, method: "GET" },
    ]) {
      const reply = await call(request);
      expect(reply.status).toBe(400);
      expect(reply.body.ok).toBe(false);
    }
    expect(server.log).toEqual([]);
  });

  it("says so, and logs why, when the deletion fails", async () => {
    server.tablesDB.listRows.mockRejectedValueOnce(Object.assign(new Error("Server error"), { code: 500 }));

    const reply = await call({ headers: signedIn, bodyText: confirmed });

    expect(reply.status).toBe(500);
    expect(reply.body).toEqual({
      ok: false,
      message: "Your account couldn't be deleted. Try again in a moment.",
    });
    expect(reply.error).toHaveBeenCalledWith(expect.stringContaining("Server error"));
    expect(server.accounts.map((user) => user.$id)).toContain(ME);
  });

  it("reads the body of older runtimes too", async () => {
    const reply = await call({ headers: signedIn, bodyText: undefined, body: { confirm: "DELETE" } });

    expect(reply.status).toBe(200);
  });
});

describe("deleting an account asked for by email", () => {
  const { run: runScript } = require("../functions/delete-account/delete-by-email");
  const sdk = () => ({
    Client: class {
      setEndpoint() {
        return this;
      }
      setProject() {
        return this;
      }
      setKey() {
        return this;
      }
    },
    TablesDB: class {
      constructor() {
        return server.tablesDB;
      }
    },
    Storage: class {
      constructor() {
        return server.storage;
      }
    },
    Users: class {
      constructor() {
        return server.users;
      }
    },
    Query,
  });
  const script = (args: string[], env: Record<string, string> = { APPWRITE_API_KEY: "key" }) => {
    const lines: string[] = [];
    return runScript({ args, env, sdk: sdk(), log: (line: string) => lines.push(line) }).then(
      (code: number) => ({ code, lines })
    );
  };

  it("only shows the account it found, without --yes", async () => {
    const { code, lines } = await script(["me@example.com"]);

    expect(code).toBe(0);
    expect(lines[0]).toContain("Me <me@example.com>");
    expect(lines[1]).toContain("--yes");
    expect(server.log).toEqual([]);
  });

  it("deletes it with --yes", async () => {
    const { code, lines } = await script([" Me@Example.com ", "--yes"]);

    expect(code).toBe(0);
    expect(lines[lines.length - 1]).toContain("Deleted 2 pianos, 4 photos, 1 payment, 1 kept rental and the account.");
    expect(server.accounts.map((user) => user.$id)).toEqual([SOMEONE_ELSE]);
  });

  it("deletes nothing when no account has the address", async () => {
    const { code, lines } = await script(["nobody@example.com", "--yes"]);

    expect(code).toBe(1);
    expect(lines).toEqual(["No Pianoverse account uses nobody@example.com. Nothing to delete."]);
    expect(server.log).toEqual([]);
  });

  it("needs the address and an API key", async () => {
    expect((await script([])).code).toBe(1);
    expect((await script(["me@example.com"], {})).code).toBe(1);
    expect(server.log).toEqual([]);
  });
});

describe("the function's settings", () => {
  const root = path.join(__dirname, "..");
  const settings = JSON.parse(fs.readFileSync(path.join(root, "appwrite.config.json"), "utf8"));
  const [fn] = settings.functions;

  it("is the function the app runs, in this project", () => {
    const appwrite = fs.readFileSync(path.join(root, "lib", "appwrite.ts"), "utf8");
    expect(appwrite).toContain(`deleteAccountFunctionId: "${fn.$id}"`);
    expect(appwrite).toContain(`projectId: "${settings.projectId}"`);
    expect(appwrite).toContain(`endpoint: "${settings.endpoint}"`);
  });

  it("points at code that exists, run by Node as in .nvmrc", () => {
    expect(fs.existsSync(path.join(root, fn.path, fn.entrypoint))).toBe(true);
    const node = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
    expect(fn.runtime).toBe(`node-${node}`);
  });

  it("can only be run by someone signed in, with only the access it needs", () => {
    expect(fn.execute).toEqual(["users"]);
    expect(fn.events).toEqual([]);
    expect(fn.schedule).toBe("");
    expect([...fn.scopes].sort()).toEqual(
      ["files.read", "files.write", "rows.read", "rows.write", "users.read", "users.write"]
    );
  });

  it("uses the same IDs as the app", () => {
    const appwrite = fs.readFileSync(path.join(root, "lib", "appwrite.ts"), "utf8");
    const id = (name: string) => appwrite.match(new RegExp(`${name}: "([^"]+)"`))?.[1];
    expect(config).toMatchObject({
      endpoint: id("endpoint"),
      projectId: id("projectId"),
      databaseId: id("databaseId"),
      userTableId: id("userCollectionId"),
      pianoTableId: id("pianoCollectionId"),
      rentPaymentsTableId: id("rentPaymentsCollectionId"),
      rentalHistoryTableId: id("rentalHistoryCollectionId"),
      storageId: id("storageId"),
    });
  });
});

// So the fake's 404s are what the function treats as "already gone"
it("treats the fake's missing things as Appwrite does", () => {
  expect(notFound("row_not_found")).toMatchObject({ code: 404 });
});
