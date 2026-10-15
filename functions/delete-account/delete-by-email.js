#!/usr/bin/env node
/**
 * For a deletion request that came by email (delete-account.html): finds the
 * Pianoverse account with that address and deletes it, and everything saved
 * with it, exactly as Account, Delete account does in the app. Only act on a
 * request sent from the account's own address.
 *
 *   cd functions/delete-account
 *   npm install
 *   APPWRITE_API_KEY=<key> node delete-by-email.js someone@example.com        shows the account
 *   APPWRITE_API_KEY=<key> node delete-by-email.js someone@example.com --yes  deletes it
 *
 * The key is an API key made in the Appwrite console (Overview, API keys)
 * with the scopes users.read, users.write, rows.read, rows.write, files.read
 * and files.write. Keep it out of this repository.
 */
const config = require("./src/config");
const { deleteAccount } = require("./src/deleteAccount");

/** Returns the exit code. `sdk` (node-appwrite) is only replaced in tests. */
const run = async ({ args, env = process.env, sdk = require("node-appwrite"), log = console.log }) => {
  const email = args.find((arg) => !arg.startsWith("--"));
  const yes = args.includes("--yes");
  if (!email) {
    log("Give the email address of the account: node delete-by-email.js someone@example.com");
    return 1;
  }
  if (!env.APPWRITE_API_KEY) {
    log("Set APPWRITE_API_KEY to an API key with the users, rows and files scopes (see the top of this file).");
    return 1;
  }

  const { Client, Query, Storage, TablesDB, Users } = sdk;
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(env.APPWRITE_API_KEY);
  const users = new Users(client);

  const { users: found } = await users.list({ queries: [Query.equal("email", email.trim().toLowerCase())] });
  if (found.length === 0) {
    log(`No Pianoverse account uses ${email}. Nothing to delete.`);
    return 1;
  }
  const [account] = found;
  log(`Found ${account.name || "(no name)"} <${account.email}>, made ${account.$createdAt}, ID ${account.$id}.`);
  if (!yes) {
    log("Run again with --yes to delete this account and everything saved with it. It can't be undone.");
    return 0;
  }

  const deleted = await deleteAccount({
    tablesDB: new TablesDB(client),
    storage: new Storage(client),
    users,
    Query,
    config,
    accountId: account.$id,
  });
  const count = (n, one) => `${n} ${one}${n === 1 ? "" : "s"}`;
  log(
    `Deleted ${count(deleted.pianos, "piano")}, ${count(deleted.photos, "photo")}, ` +
      `${count(deleted.payments, "payment")}, ${count(deleted.rentals, "kept rental")}, ` +
      `${count(deleted.services, "service")}, ` +
      `${count(deleted.formEvents, "form usage count")} and the account. ` +
      "Reply to the request to say it's done."
  );
  return 0;
};

if (require.main === module) {
  run({ args: process.argv.slice(2) }).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`The deletion stopped: ${error?.message ?? error}. Run it again to finish.`);
      process.exit(1);
    }
  );
}

module.exports = { run };
