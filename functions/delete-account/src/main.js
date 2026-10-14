const { Client, Query, Storage, TablesDB, Users } = require("node-appwrite");
const config = require("./config");
const { deleteAccount } = require("./deleteAccount");

/**
 * The delete-account Appwrite Function: deletes the account of whoever runs
 * it, and everything saved with it (see deleteAccount.js). The app runs it
 * from Account, Delete account.
 *
 * Appwrite says who is signed in (x-appwrite-user-id; only signed-in people
 * may run it) and gives each run a key with the function's scopes
 * (x-appwrite-key). It only goes ahead for a POST that says {"confirm":
 * "DELETE"}, so a link or a stray request can't delete an account.
 */
module.exports = async ({ req, res, log, error }) => {
  const accountId = req.headers["x-appwrite-user-id"];
  if (!accountId) {
    return res.json({ ok: false, message: "Sign in to delete your account." }, 401);
  }

  let confirmed = false;
  try {
    // bodyText in the current runtimes, body in older ones
    const body = req.bodyText ?? req.body ?? "";
    const json = typeof body === "string" ? JSON.parse(body || "{}") : body;
    confirmed = req.method === "POST" && json?.confirm === "DELETE";
  } catch {
    confirmed = false;
  }
  if (!confirmed) {
    return res.json({ ok: false, message: "Nothing was deleted: the request wasn't confirmed." }, 400);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);

  try {
    const deleted = await deleteAccount({
      tablesDB: new TablesDB(client),
      storage: new Storage(client),
      users: new Users(client),
      Query,
      config,
      accountId,
      log,
    });
    return res.json({ ok: true, deleted });
  } catch (failure) {
    error(`Could not delete account ${accountId}: ${failure?.stack ?? failure}`);
    return res.json(
      { ok: false, message: "Your account couldn't be deleted. Try again in a moment." },
      500
    );
  }
};
