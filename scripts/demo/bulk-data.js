// Many pianos for a speed check (Batch 50, O2): 150 more pianos on top of the
// demo data (scripts/demo/demo-data.js), with a year of rent payments and the
// tunings, so the app can be timed with a business several times the owner's
// size. Every ID starts with "demo_bulk_", so `remove` deletes exactly what
// `seed` made and nothing else. The pictures are the demo data's, so seed that first.
//
//   node scripts/demo/bulk-data.js plan                    shows what would be made, writes nothing
//   node scripts/demo/bulk-data.js seed   --account-id ID --users-row ID
//   node scripts/demo/bulk-data.js remove --account-id ID --users-row ID
//
// Run from the project folder, with the Appwrite CLI signed in (`appwrite login`).
// No reminder made by it falls in the next week: the rentals that ended did so
// more than a week ago, and the others end more than two weeks from now. A phone
// that opened the app while the data was there drops its reminders the next
// time it opens the app after `remove`.
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const flag = (name) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 ? process.argv[at + 1] : undefined;
};
const ACCOUNT_ID = flag("account-id") ?? "ACCOUNT_ID_NEEDED";
const USERS_ROW = flag("users-row") ?? "USERS_ROW_NEEDED";
const COUNT = Number(flag("count") ?? 150);
const DB = "66b26b1300171b9140be";
const T = {
  pianos: "66b26b3c002284a5a862",
  payments: "rent_payments",
  service: "service_log",
};
const BUCKET = "66b26b77003445e612b4";
const PROJECT = "66b2693000154e2fa3c8";

// ---- dates (UTC calendar days, like the app's stored days)
const DAY = 864e5;
const now = new Date();
const TODAY = new Date(
  Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
);
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const addMonths = (d, n) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(
    Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0),
  ).getUTCDate();
  t.setUTCDate(Math.min(d.getUTCDate(), last));
  return t;
};
const iso = (d) => d.toISOString().slice(0, 10) + "T00:00:00.000+00:00";

// ---- a repeatable pseudo-random choice, so the data is the same every time
let seed = 50150;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (items) => items[Math.floor(rnd() * items.length)];
const between = (low, high) => low + Math.floor(rnd() * (high - low + 1));

const MAKES = [
  "Samick",
  "Young Chang",
  "Weber",
  "Kawai",
  "Yamaha",
  "Pearl River",
  "Feurich",
  "Schimmel",
  "Petrof",
  "Ritmuller",
  "Kurlmuller",
  "Rosenstock",
];
const COMPANIES = [
  "Shamshersons",
  "Kirpalsons",
  "RS Music Center",
  "The Piano Services",
];
const FIRST = [
  "Aman",
  "Harpreet",
  "Neha",
  "Rohit",
  "Simran",
  "Gurpreet",
  "Ankit",
  "Priya",
  "Manpreet",
  "Vikram",
  "Kiran",
  "Jaspreet",
  "Rahul",
  "Navneet",
  "Sunita",
];
const LAST = [
  "Sharma",
  "Gill",
  "Arora",
  "Sandhu",
  "Kapoor",
  "Bedi",
  "Malhotra",
  "Grewal",
  "Chopra",
  "Dhillon",
  "Mehta",
  "Sidhu",
];
const PLACES = [
  "Model Town, Jalandhar",
  "Sarabha Nagar, Ludhiana",
  "Ranjit Avenue, Amritsar",
  "Sector 22, Chandigarh",
  "Civil Lines, Patiala",
  "Urban Estate, Bathinda",
];
const METHODS = [
  "UPI",
  "UPI",
  "UPI",
  "Cash",
  "Cash",
  "Cheque",
  "Bank transfer",
  "",
];
// The demo data's pictures, shared
const PICTURES = Array.from(
  { length: 16 },
  (_, i) => `p${String(i + 1).padStart(2, "0")}`,
);
const photoUrl = (key) =>
  `https://cloud.appwrite.io/v1/storage/buckets/${BUCKET}/files/demo_img_${key}/view?project=${PROJECT}`;

const out = { pianos: [], payments: [], service: [] };
const id = (kind, n) => `demo_bulk_${kind}${String(n).padStart(4, "0")}`;

for (let n = 1; n <= COUNT; n++) {
  const make = pick(MAKES);
  const picture = photoUrl(pick(PICTURES));
  const pianoId = id("p", n);
  const data = {
    users: USERS_ROW,
    creator: ACCOUNT_ID,
    make,
    title: `${make} ${pick(["U", "UP", "GP", "SU", "K"])}-${between(100, 199)} #${n}`,
    description: "Speed-check piano (bulk test data).",
    company_associated: pick(COMPANIES),
    image_url: picture,
    image_urls: [picture],
    date_of_purchase: iso(addDays(TODAY, -between(60, 1500))),
    purchase_price: between(30, 250) * 1000,
    tuning_interval_months: pick([3, 6, 6, 6, 12]),
  };
  // 60% out on rent, then rentable in stock, events, on sale (a third of them sold) and warehouse
  const share = n / COUNT;
  if (share <= 0.6) {
    // One in six ended more than a week ago and wasn't returned; the rest end in 15 days to a year
    const ended = n % 6 === 0;
    const end = ended
      ? addDays(TODAY, -between(8, 60))
      : addDays(TODAY, between(15, 365));
    const start = addMonths(addDays(end, 1), -between(6, 14));
    const rent = between(25, 80) * 100;
    const customer = `${pick(FIRST)} ${pick(LAST)}`;
    Object.assign(data, {
      category: "rentable",
      rental_customer_name: customer,
      rental_customer_mobile: `98${between(10000000, 99999999)}`,
      rental_customer_address: pick(PLACES),
      rental_period_start: iso(start),
      rental_period_end: iso(end),
      rental_price: rent,
      rental_deposit: rent * 2,
      deposit_received_on: iso(start),
    });
    // A payment for each month so far, with one in four rentals a month or two behind
    const behind = n % 4 === 0 ? between(1, 2) : 0;
    const days = [];
    for (let m = 0; ; m++) {
      const due = addMonths(start, m);
      if (due > TODAY || due > end) break;
      days.push(due);
    }
    days.slice(0, Math.max(0, days.length - behind)).forEach((due) => {
      const note = pick(METHODS);
      out.payments.push({
        piano_id: pianoId,
        creator: ACCOUNT_ID,
        amount: rent,
        paid_on: iso(
          new Date(
            Math.min(addDays(due, between(0, 3)).getTime(), TODAY.getTime()),
          ),
        ),
        customer_name: customer,
        ...(note ? { note } : {}),
      });
    });
  } else if (share <= 0.72) {
    data.category = "rentable";
  } else if (share <= 0.82) {
    Object.assign(data, {
      category: "events",
      event_model_number: `EV-${between(100, 999)}`,
      event_b_number: `B-${between(10000, 99999)}`,
    });
  } else if (share <= 0.92) {
    Object.assign(data, {
      category: "on_sale",
      on_sale_price: between(50, 300) * 1000,
      on_sale_import_date: iso(addDays(TODAY, -between(30, 400))),
    });
    if (n % 3 === 0) {
      Object.assign(data, {
        sold_to_name: `${pick(FIRST)} ${pick(LAST)}`,
        sold_date: iso(addDays(TODAY, -between(5, 300))),
        sold_price: between(50, 300) * 1000,
      });
    }
  } else {
    Object.assign(data, {
      category: "warehouse",
      warehouse_since_date: iso(addDays(TODAY, -between(10, 500))),
    });
  }
  out.pianos.push({ $id: pianoId, ...data });
  // Every other piano was tuned: half of those long enough ago to be overdue, the rest
  // 20 to 60 days ago, so no tuning falls due (with its 9:00 reminder) in the next weeks
  if (n % 2 === 0) {
    const months = data.tuning_interval_months;
    const ago = n % 4 === 0 ? months * 31 + between(5, 60) : between(20, 60);
    out.service.push({
      piano_id: pianoId,
      creator: ACCOUNT_ID,
      serviced_on: iso(addDays(TODAY, -ago)),
      kind: "tuning",
      cost: between(8, 20) * 100,
    });
  }
}
out.payments = out.payments.map((row, i) => ({
  $id: id("pay", i + 1),
  ...row,
}));
out.service = out.service.map((row, i) => ({ $id: id("svc", i + 1), ...row }));

// ---- running it
const permissions = [
  `read("user:${ACCOUNT_ID}")`,
  `update("user:${ACCOUNT_ID}")`,
  `delete("user:${ACCOUNT_ID}")`,
];
// On Windows appwrite is a .cmd file, which only a shell can start; so its script is run with node
// directly, which keeps the JSON in the arguments out of the shell
const appwriteScript = () => {
  const found = spawnSync("where", ["appwrite.cmd"], {
    encoding: "utf8",
  }).stdout.split(/\r?\n/)[0];
  return path.join(
    path.dirname(found),
    "node_modules",
    "appwrite-cli",
    "run.js",
  );
};
const command = (args) =>
  process.platform === "win32"
    ? ["node", [appwriteScript(), ...args, "-f", "-j"]]
    : ["appwrite", [...args, "-f", "-j"]];
const cli = (args) => spawnSync(...command(args), { encoding: "utf8" });
/** The same, without waiting: resolves with the exit status. */
const cliAsync = (args) =>
  new Promise((resolve) => {
    const child = spawn(...command(args), { stdio: "ignore" });
    child.on("close", (status) => resolve(status));
  });

// Required (by a speed test) rather than run: just the rows
const action = require.main === module ? process.argv[2] : "none";
module.exports = { out };
if (
  (action === "seed" || action === "remove") &&
  (ACCOUNT_ID === "ACCOUNT_ID_NEEDED" || USERS_ROW === "USERS_ROW_NEEDED")
) {
  console.error(
    "Give the account: --account-id <Appwrite user ID> --users-row <its row in the users table>",
  );
  process.exit(1);
}
if (action === "plan") {
  for (const kind of Object.keys(out))
    console.log(kind.padEnd(10), out[kind].length);
  const rented = out.pianos.filter((p) => p.rental_period_end);
  console.log(
    "rented".padEnd(10),
    rented.length,
    `(${rented.filter((p) => new Date(p.rental_period_end) < TODAY).length} ended)`,
  );
} else if (action === "seed") {
  (async () => {
    // The pianos one at a time, six at once (Appwrite can't make rows with a relationship
    // column, here `users`, in bulk); a piano already there is skipped
    const pianos = [...out.pianos];
    let made = 0;
    const worker = async () => {
      while (pianos.length > 0) {
        const { $id, ...data } = pianos.shift();
        const args = [
          "tablesdb",
          "create-row",
          "--database-id",
          DB,
          "--table-id",
          T.pianos,
          "--row-id",
          $id,
          "--data",
          JSON.stringify(data),
        ];
        if (
          (await cliAsync([
            ...args,
            ...permissions.flatMap((p) => ["--permissions", p]),
          ])) === 0
        )
          made++;
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    console.log(`pianos ${made} / ${out.pianos.length} made`);
    // The rest as many rows a call as fit in a Windows command line (32,767 characters); a
    // row that is already there stops the batch, so seed only once
    for (const kind of ["payments", "service"]) {
      const rows = out[kind].map((row) =>
        JSON.stringify({ ...row, $permissions: permissions }),
      );
      let done = 0;
      while (done < rows.length) {
        const batch = [];
        let length = 0;
        while (
          done + batch.length < rows.length &&
          batch.length < 100 &&
          length + rows[done + batch.length].length < 20000
        ) {
          length += rows[done + batch.length].length + 10;
          batch.push(rows[done + batch.length]);
        }
        const result = cli([
          "tablesdb",
          "create-rows",
          "--database-id",
          DB,
          "--table-id",
          T[kind],
          ...batch.flatMap((row) => ["--rows", row]),
        ]);
        if (result.status !== 0) {
          console.error(
            `FAILED ${kind} ${done + 1}-${done + batch.length}:\n${`${result.error ?? ""}${result.stdout}${result.stderr}`.slice(0, 800)}`,
          );
          process.exit(1);
        }
        done += batch.length;
        console.log(`${kind} ${done} / ${rows.length}`);
      }
    }
  })();
} else if (action === "remove") {
  // One row at a time, by its ID (never a bulk delete, which with no query would take every row), six at once
  const all = Object.keys(out)
    .reverse()
    .flatMap((kind) => out[kind].map((row) => ({ kind, id: row.$id })));
  let next = 0;
  let gone = 0;
  const worker = async () => {
    while (next < all.length) {
      const { kind, id: rowId } = all[next++];
      if (
        (await cliAsync([
          "tablesdb",
          "delete-row",
          "--database-id",
          DB,
          "--table-id",
          T[kind],
          "--row-id",
          rowId,
        ])) === 0
      )
        gone++;
      if (next % 50 === 0) console.log(`${next} / ${all.length}`);
    }
  };
  Promise.all(Array.from({ length: 6 }, worker)).then(() =>
    console.log(`removed ${gone} of ${all.length} rows`),
  );
} else if (action !== "none") {
  console.log(
    "node scripts/demo/bulk-data.js plan | seed | remove  [--account-id ID --users-row ID] [--count 150]",
  );
}
