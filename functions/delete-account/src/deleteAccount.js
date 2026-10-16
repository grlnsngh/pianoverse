/**
 * Deletes everything Pianoverse keeps for one account, then the account: its
 * rent payments, kept rentals, service log and pianos, the photos of those
 * pianos and of the person, the paper forms' usage counts, their user row, and
 * the Appwrite account itself, which also ends every session.
 *
 * The account goes last, so a deletion that stops half way (a timeout, a lost
 * connection) leaves the person signed in to ask again, and every step is safe
 * to run twice: rows and files that are already gone are skipped.
 *
 * The Appwrite services are passed in (node-appwrite's TablesDB, Storage and
 * Users, and its Query), so the function, the email-request script and the
 * tests share this one copy.
 */

const PAGE_SIZE = 100;
// Deletes sent at once; Appwrite takes these in parallel without trouble
const AT_ONCE = 10;

/** True for a 404: the row, file, table or user isn't there (any more). */
const isNotFound = (error) => error?.code === 404;

/** The file ID in a view or preview URL of a file in `bucketId`, or null. */
const fileIdFromUrl = (url, bucketId) => {
  if (typeof url !== "string") return null;
  const match = url.match(new RegExp(`/storage/buckets/${bucketId}/files/([^/?#]+)`));
  return match ? match[1] : null;
};

/**
 * What a photo is named after: uploadFile() in the app names files
 * `userId_<owner>_itemTitle_<title>_<time>.<ext>`, with the ID cleaned the
 * same way. The owner is the person's user row for a piano photo and their
 * account for a profile photo.
 */
const photoNamePrefix = (ownerId) =>
  `userId_${String(ownerId).replace(/[^a-zA-Z0-9-_]/g, "_")}_`;

const inBatches = async (items, work) => {
  for (let start = 0; start < items.length; start += AT_ONCE) {
    await Promise.all(items.slice(start, start + AT_ONCE).map(work));
  }
};

async function deleteAccount({ tablesDB, storage, users, Query, config, accountId, log = () => {} }) {
  if (!accountId) throw new Error("No account to delete");
  const { databaseId, storageId } = config;

  /** Every row of `tableId` whose `column` is `value`; none if the table doesn't exist. */
  const rowsWhere = async (tableId, column, value) => {
    const rows = [];
    let cursor;
    for (;;) {
      const queries = [Query.equal(column, value), Query.limit(PAGE_SIZE)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      let page;
      try {
        page = await tablesDB.listRows({ databaseId, tableId, queries });
      } catch (error) {
        // rental_history and form_events are only there once the owner has made them
        if (isNotFound(error)) return rows;
        throw error;
      }
      rows.push(...page.rows);
      if (page.rows.length < PAGE_SIZE) return rows;
      cursor = page.rows[page.rows.length - 1].$id;
    }
  };

  const deleteRows = (tableId, rows) =>
    inBatches(rows, async (row) => {
      try {
        await tablesDB.deleteRow({ databaseId, tableId, rowId: row.$id });
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    });

  /** Uploads named after `ownerId`, including any left behind by a failed save. */
  const filesNamedFor = async (ownerId) => {
    const ids = [];
    let cursor;
    try {
      for (;;) {
        const queries = [Query.startsWith("name", photoNamePrefix(ownerId)), Query.limit(PAGE_SIZE)];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const { files } = await storage.listFiles({ bucketId: storageId, queries });
        ids.push(...files.map((file) => file.$id));
        if (files.length < PAGE_SIZE) return ids;
        cursor = files[files.length - 1].$id;
      }
    } catch (error) {
      // The photos the rows point to are still found; these are only extras
      log(`Could not look for files by name: ${error?.message ?? error}`);
      return ids;
    }
  };

  const [payments, rentals, pianos, profiles, formEvents, services, expenses] = await Promise.all([
    rowsWhere(config.rentPaymentsTableId, "creator", accountId),
    rowsWhere(config.rentalHistoryTableId, "creator", accountId),
    rowsWhere(config.pianoTableId, "creator", accountId),
    rowsWhere(config.userTableId, "accountId", accountId),
    rowsWhere(config.formEventsTableId, "creator", accountId),
    rowsWhere(config.serviceLogTableId, "creator", accountId),
    rowsWhere(config.expensesTableId, "creator", accountId),
  ]);

  // Piano photos are named after the person's user row, profile photos after the account
  const owners = [accountId, ...profiles.map((profile) => profile.$id)];
  const photoIds = new Set((await Promise.all(owners.map(filesNamedFor))).flat());
  for (const piano of pianos) {
    for (const url of [piano.image_url, ...(piano.image_urls ?? [])]) {
      const id = fileIdFromUrl(url, storageId);
      if (id) photoIds.add(id);
    }
  }
  for (const profile of profiles) {
    // An uploaded profile photo; a Google photo or initials aren't in the bucket
    const id = fileIdFromUrl(profile.avatar, storageId);
    if (id) photoIds.add(id);
  }

  await deleteRows(config.rentPaymentsTableId, payments);
  await deleteRows(config.rentalHistoryTableId, rentals);
  await deleteRows(config.formEventsTableId, formEvents);
  await deleteRows(config.serviceLogTableId, services);
  await deleteRows(config.expensesTableId, expenses);
  await deleteRows(config.pianoTableId, pianos);
  await inBatches([...photoIds], async (fileId) => {
    try {
      await storage.deleteFile({ bucketId: storageId, fileId });
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  });
  await deleteRows(config.userTableId, profiles);

  try {
    await users.delete({ userId: accountId });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  const deleted = {
    pianos: pianos.length,
    payments: payments.length,
    rentals: rentals.length,
    photos: photoIds.size,
    profiles: profiles.length,
    formEvents: formEvents.length,
    services: services.length,
    expenses: expenses.length,
  };
  log(`Deleted account ${accountId}: ${JSON.stringify(deleted)}`);
  return deleted;
}

module.exports = { deleteAccount, fileIdFromUrl, photoNamePrefix };
