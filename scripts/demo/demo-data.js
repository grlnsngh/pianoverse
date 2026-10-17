// Demo data for one Pianoverse account, so the app can be seen with real-looking
// entries without typing them in: 16 pianos of every kind (rented, in stock,
// events, on sale, warehouse, sold) with their pictures, rent payments, past
// renters with deposits, tunings and repairs, and four months of expenses. It
// is for testing; the people and shops are made up. Every ID starts with
// "demo_", so `remove` deletes exactly what `seed` made and nothing else.
//
//   python scripts/demo/demo-images.py scripts/demo/demo-img     draws the pictures (needs Pillow), once
//   node scripts/demo/demo-data.js plan                          shows what would be made, writes nothing
//   node scripts/demo/demo-data.js seed                          makes it
//   node scripts/demo/demo-data.js remove                        deletes it again
//
// Run from the project folder, with the Appwrite CLI signed in (`appwrite login`).
// The account is given with --account-id (the Appwrite user ID) and --users-row
// (that account's row in the users table, whose accountId is the same); both are
// in the Appwrite console. Every row and picture is given to that account only.
// Dates are worked out from today, so the rents fall due and the tunings come
// due in the next days and weeks the way real ones would.
const path = require("path");
const { spawnSync } = require("child_process");

const flag = (name) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 ? process.argv[at + 1] : process.env[`DEMO_${name.replace("-", "_").toUpperCase()}`];
};
const ACCOUNT_ID = flag("account-id") ?? "ACCOUNT_ID_NEEDED";
const USERS_ROW = flag("users-row") ?? "USERS_ROW_NEEDED";
const DB = "66b26b1300171b9140be";
const T = {
  pianos: "66b26b3c002284a5a862",
  payments: "rent_payments",
  history: "6abdffe40034432a5cde",
  service: "service_log",
  expenses: "expenses",
};
const BUCKET = "66b26b77003445e612b4";
const PROJECT = "66b2693000154e2fa3c8";
const IMAGES = path.join(__dirname, "demo-img");

// ---- dates (UTC calendar days, like the app's stored days)
const DAY = 864e5;
const now = new Date();
const TODAY = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const at = (y, m, d) => new Date(Date.UTC(y, m, d));
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const addMonths = (d, n) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d.getUTCDate(), last));
  return t;
};
const iso = (d) => d.toISOString().slice(0, 10) + "T00:00:00.000+00:00";
const monthsAgoOn = (months, day) => at(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - months, day);
const daysAgo = (n) => addDays(TODAY, -n);
const dueDates = (start, end) => {
  const days = [];
  for (let n = 0; ; n++) {
    const day = addMonths(start, n);
    if (day > TODAY || day >= end) return days;
    days.push(day);
  }
};

// ---- a repeatable pseudo-random choice, so the data is the same every time
let seed = 20261017;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (items) => items[Math.floor(rnd() * items.length)];
const noteFor = (method) => (method ? { note: method } : {});
const METHODS = ["UPI", "UPI", "UPI", "Cash", "Cash", "Cheque", "Bank transfer", ""];

// ---- the pianos
const SH = "Shamshersons";
const KP = "Kirpalsons";
const RS = "RS Music Center";
const TPS = "The Piano Services";

const rentals = [
  { key: "p01", title: "Samick SU-118", make: "Samick", company: SH, bought: 62000, boughtMonthsAgo: 30,
    desc: "Upright, walnut finish. Tuned and polished before every rental.", tuning: 3,
    customer: "Hotel Taj Residency", mobile: "9814055021", address: "Mall Road, Amritsar",
    start: monthsAgoOn(4, 5), months: 12, rent: 4500, deposit: 9000 },
  { key: "p02", title: "Young Chang U-121", make: "Young Chang", company: KP, bought: 58000, boughtMonthsAgo: 26,
    desc: "Black upright with a soft-close lid. Bench included.", tuning: 6,
    customer: "Meera Kapoor", mobile: "9876512345", address: "Sarabha Nagar, Ludhiana",
    start: monthsAgoOn(7, 12), months: 9, rent: 3500, deposit: 7000, skipLast: 2 },
  { key: "p03", title: "Weber W-121", make: "Weber", company: RS, bought: 88000, boughtMonthsAgo: 22,
    desc: "Hotel lobby piano, ebony. A cover and a bench come with it.", tuning: 6,
    customer: "Hotel Grand Mercure", mobile: "9815098765", address: "GT Road, Jalandhar",
    start: monthsAgoOn(9, 20), months: 10, rent: 6000, deposit: 12000 },
  { key: "p04", title: "Rosenstock R-130", make: "Rosenstock", company: TPS, bought: 46000, boughtMonthsAgo: 40,
    desc: "Tall upright, rosewood. Good for practice.", tuning: 6,
    customer: "Rajinder Singh", mobile: "9988776655", address: "Model Town, Jalandhar",
    start: monthsAgoOn(11, 2), months: 11, rent: 3000, deposit: 6000 },
  { key: "p05", title: "Pearl River GP-160", make: "Pearl River", company: SH, bought: 245000, boughtMonthsAgo: 14,
    desc: "Grand piano, polished ebony, for the school's music hall.", tuning: 3,
    customer: "St. Xavier's School", mobile: "9417011223", address: "Civil Lines, Patiala",
    start: monthsAgoOn(2, 1), months: 6, rent: 8000, deposit: 16000 },
  { key: "p06", title: "Feurich 122", make: "Feurich", company: KP, bought: 140000, boughtMonthsAgo: 11,
    desc: "German upright, very quiet touch.", tuning: 6,
    customer: "Simran Arora", mobile: "9501234567", address: "BRS Nagar, Ludhiana",
    start: monthsAgoOn(0, 3), months: 12, rent: 5000, deposit: 10000 },
  { key: "p07", title: "Kurlmuller K-125", make: "Kurlmuller", company: RS, bought: 52000, boughtMonthsAgo: 34,
    desc: "Upright for the hotel's restaurant, walnut.", tuning: 6,
    customer: "Hotel Park Plaza", mobile: "9872200110", address: "Ferozepur Road, Ludhiana",
    start: monthsAgoOn(6, 19), months: 6, rent: 4000, deposit: 0 },
];

// Past renters (they go in the piano's rental history), with their rent and how the deposit ended
const history = [
  { piano: "p01", customer: "Hotel Lemon Tree", mobile: "9815033221", address: "Rajpura Road, Patiala",
    months: 14, rent: 4200, deposit: 8400, refunded: 8400, reason: "replaced", endsBefore: "p01" },
  { piano: "p02", customer: "Karan Malhotra", mobile: "9878123456", address: "Dugri, Ludhiana",
    months: 6, rent: 3200, deposit: 6400, refunded: 5400, note: "damage", reason: "returned", endsBefore: "p02", gapDays: 6 },
  { piano: "p08", customer: "Sanjay Verma", mobile: "9914455667", address: "Sector 8, Chandigarh",
    months: 12, rent: 3300, deposit: 6600, refunded: 6600, reason: "returned", endsMonthsAgo: 4, endDay: 30 },
  { piano: "p09", customer: "Pooja Bansal", mobile: "9780011223", address: "Adarsh Nagar, Jalandhar",
    months: 5, rent: 5200, deposit: 10400, refunded: 8900, note: "unpaid rent", reason: "returned", endsMonthsAgo: 2, endDay: 14, keptFromDeposit: 1500 },
];

const others = [
  { key: "p08", category: "rentable", title: "Samick SU-121", make: "Samick", company: SH, bought: 54000, boughtMonthsAgo: 28,
    desc: "Upright, mahogany. Available now.", tuning: 6 },
  { key: "p09", category: "rentable", title: "Schimmel W-114", make: "Schimmel", company: KP, bought: 190000, boughtMonthsAgo: 19,
    desc: "German upright, glossy black. Available now.", tuning: 12 },
  { key: "p10", category: "events", title: "Petrof P-125", make: "Petrof", company: RS, bought: 185000, boughtMonthsAgo: 16,
    desc: "For weddings and stage shows.", from: "Delhi Music House", model: "P125-F1", bno: "B-20417", tuning: 6 },
  { key: "p11", category: "events", title: "Russian Belarus BG-165", make: "Russian", company: TPS, bought: 120000, boughtMonthsAgo: 21,
    desc: "Baby grand for concerts. Needs two people to move.", from: "Chandigarh Pianos", model: "BG-165", bno: "B-18802" },
  { key: "p12", category: "on_sale", title: "Burgmann Cabinet", make: "Burgmann", company: SH, bought: 52000, boughtMonthsAgo: 8,
    desc: "Imported cabinet piano in good condition.", from: "Mumbai Imports", saleMonthsAgo: 8, price: 85000 },
  { key: "p13", category: "on_sale", title: "Ritmuller UP-118", make: "Ritmuller", company: KP, bought: 41000, boughtMonthsAgo: 3,
    desc: "Upright, imported last quarter. Single owner.", from: "Kolkata Traders", saleMonthsAgo: 3, price: 62000 },
  { key: "p14", category: "warehouse", title: "Collard & Collerd Antique", make: "Collard & Collerd", company: TPS, bought: 30000, boughtMonthsAgo: 44,
    desc: "Old English upright, kept covered until restored.", storedMonthsAgo: 10 },
  { key: "p15", category: "warehouse", title: "Zimmermann Z-116", make: "Zimmermann", company: RS, bought: 38000, boughtMonthsAgo: 18,
    desc: "Waiting for new felts before it goes out.", storedMonthsAgo: 3 },
  { key: "p16", category: "on_sale", title: "Rameau R-118", make: "Rameau", company: SH, bought: 45000, boughtMonthsAgo: 12,
    desc: "Sold. Delivered with a bench.", from: "Delhi Music House", saleMonthsAgo: 11, price: 78000,
    sold: { to: "Anil Mehra", address: "Sector 17, Chandigarh", monthsAgo: 2, price: 72000 } },
];

const out = { pianos: [], payments: [], history: [], service: [], expenses: [] };
const photoUrl = (key) => `https://cloud.appwrite.io/v1/storage/buckets/${BUCKET}/files/demo_img_${key}/view?project=${PROJECT}`;
const base = (p, category) => ({
  users: USERS_ROW,
  creator: ACCOUNT_ID,
  category,
  make: p.make,
  title: p.title,
  description: p.desc,
  company_associated: p.company,
  image_url: photoUrl(p.key),
  image_urls: [photoUrl(p.key)],
  date_of_purchase: iso(monthsAgoOn(p.boughtMonthsAgo, 10)),
  purchase_price: p.bought,
  ...(p.tuning ? { tuning_interval_months: p.tuning } : {}),
});

const startOf = {};
for (const r of rentals) {
  const end = addDays(addMonths(r.start, r.months), -1);
  startOf[r.key] = r.start;
  out.pianos.push({
    id: `demo_${r.key}`,
    data: {
      ...base(r, "rentable"),
      rental_customer_name: r.customer,
      rental_customer_address: r.address,
      rental_customer_mobile: r.mobile,
      rental_period_start: iso(r.start),
      rental_period_end: iso(end),
      rental_price: r.rent,
      ...(r.deposit ? { rental_deposit: r.deposit, deposit_received_on: iso(r.start) } : {}),
    },
  });
  const days = dueDates(r.start, end);
  days.forEach((due, index) => {
    if (r.skipLast && index >= days.length - r.skipLast) return;
    out.payments.push({
      data: {
        piano_id: `demo_${r.key}`,
        creator: ACCOUNT_ID,
        amount: r.rent,
        paid_on: iso(new Date(Math.min(addDays(due, Math.floor(rnd() * 3)).getTime(), TODAY.getTime()))),
        customer_name: r.customer,
        ...noteFor(pick(METHODS)),
      },
    });
  });
}

for (const o of others) {
  const data = base(o, o.category);
  if (o.category === "events") {
    Object.assign(data, {
      event_purchase_price: o.bought,
      event_purchase_from: o.from,
      event_model_number: o.model,
      event_b_number: o.bno,
    });
  } else if (o.category === "on_sale") {
    Object.assign(data, {
      on_sale_purchase_from: o.from,
      on_sale_import_date: iso(monthsAgoOn(o.saleMonthsAgo, 6)),
      on_sale_price: o.price,
    });
    if (o.sold) {
      Object.assign(data, {
        sold_to_name: o.sold.to,
        sold_to_address: o.sold.address,
        sold_date: iso(monthsAgoOn(o.sold.monthsAgo, 20)),
        sold_price: o.sold.price,
      });
    }
  } else if (o.category === "warehouse") {
    data.warehouse_since_date = iso(monthsAgoOn(o.storedMonthsAgo, 1));
  }
  out.pianos.push({ id: `demo_${o.key}`, data });
}

history.forEach((h, index) => {
  let periodEnd;
  if (h.endsBefore) periodEnd = addDays(startOf[h.endsBefore], -(h.gapDays ?? 1));
  else periodEnd = monthsAgoOn(h.endsMonthsAgo, h.endDay);
  const periodStart = addDays(addMonths(periodEnd, -h.months), 1);
  const closed = h.reason === "replaced" ? addDays(periodEnd, 1) : addDays(periodEnd, 1);
  out.history.push({
    id: `demo_h${String(index + 1).padStart(2, "0")}`,
    data: {
      piano_id: `demo_${h.piano}`,
      creator: ACCOUNT_ID,
      closed_on: iso(closed),
      piano_title: [...rentals, ...others].find((p) => p.key === h.piano).title,
      customer_name: h.customer,
      customer_mobile: h.mobile,
      customer_address: h.address,
      period_start: iso(periodStart),
      period_end: iso(periodEnd),
      price: h.rent,
      deposit: h.deposit,
      deposit_refunded: h.refunded,
      ...(h.note ? { deposit_note: h.note } : {}),
      reason: h.reason,
    },
  });
  for (const due of dueDates(periodStart, addDays(periodEnd, 1))) {
    out.payments.push({
      data: {
        piano_id: `demo_${h.piano}`,
        creator: ACCOUNT_ID,
        amount: h.rent,
        paid_on: iso(addDays(due, Math.floor(rnd() * 3))),
        customer_name: h.customer,
        ...noteFor(pick(METHODS)),
      },
    });
  }
  if (h.keptFromDeposit) {
    out.payments.push({
      data: {
        piano_id: `demo_${h.piano}`,
        creator: ACCOUNT_ID,
        amount: h.keptFromDeposit,
        paid_on: iso(closed),
        customer_name: h.customer,
        note: "From deposit",
      },
    });
  }
});

// ---- tunings, repairs and moves
const service = [
  ["p01", 70, "tuning", 1200, "Tuned before the new season"],
  ["p02", 220, "tuning", 1000, "Regular tuning"],
  ["p03", 160, "tuning", 1500, "Lobby piano, tuned at night"],
  ["p04", 100, "tuning", 1000, ""],
  ["p05", 50, "tuning", 2000, "Grand piano, full tuning and regulation"],
  ["p06", 12, "tuning", 1000, "Tuned on delivery"],
  ["p07", 150, "tuning", 1200, ""],
  ["p07", 140, "repair", 3500, "Replaced two hammers"],
  ["p08", 90, "repair", 2500, "Fixed a sticking key and the pedal"],
  ["p08", 20, "tuning", 1000, "Ready for the next renter"],
  ["p10", 25, "tuning", 1800, "Before the wedding season"],
  ["p10", 25, "moving", 2500, "Taken to the venue and back"],
  ["p12", 40, "cleaning", 600, "Cleaned and polished for the showroom"],
  ["p14", 100, "cleaning", 800, "Dusted and re-covered"],
  ["p16", 80, "tuning", 1200, "Tuned before it was sold"],
  ["p05", 130, "moving", 3000, "Delivered to the school"],
];
service.forEach(([piano, ago, kind, cost, note]) => {
  out.service.push({
    data: {
      piano_id: `demo_${piano}`,
      creator: ACCOUNT_ID,
      serviced_on: iso(daysAgo(ago)),
      kind,
      cost,
      ...(note ? { note } : {}),
    },
  });
});

// ---- what the business spent, the last four months
for (let ago = 0; ago <= 3; ago++) {
  const month = (day) => iso(monthsAgoOn(ago, day));
  const later = (day) => (ago === 0 && monthsAgoOn(0, day) > TODAY ? null : month(day));
  const add = (day, amount, category, note) => {
    const spent = later(day);
    if (spent) out.expenses.push({ data: { creator: ACCOUNT_ID, spent_on: spent, amount, category, note } });
  };
  add(1, 28000, "shop", "Shop and godown rent");
  add(3, 22000, "staff", "Helper's salary");
  add(7, 2300 + Math.floor(rnd() * 800), "other", "Electricity bill");
  add(11, 2500, "transport", "Tempo for deliveries");
  if (ago !== 2) add(15, 1800 + Math.floor(rnd() * 700), "transport", "Petrol for the van");
  if (ago === 1) add(9, 6000, "advertising", "Stall at the wedding fair");
  if (ago === 3) add(9, 3500, "advertising", "Online listing for the year");
  if (ago === 2) add(18, 1200, "other", "Polish, cloths and felt");
}

// ---- running it
const permissions = [`read("user:${ACCOUNT_ID}")`, `update("user:${ACCOUNT_ID}")`, `delete("user:${ACCOUNT_ID}")`];
// On Windows appwrite is a .cmd file, which only a shell can start; so its script is run with node
// directly, which keeps the JSON in the arguments out of the shell
const appwriteScript = () => {
  const found = spawnSync("where", ["appwrite.cmd"], { encoding: "utf8" }).stdout.split(/\r?\n/)[0];
  return path.join(path.dirname(found), "node_modules", "appwrite-cli", "run.js");
};
const cli = (args) =>
  process.platform === "win32"
    ? spawnSync("node", [appwriteScript(), ...args, "-f", "-j"], { encoding: "utf8" })
    : spawnSync("appwrite", [...args, "-f", "-j"], { encoding: "utf8" });
const idFor = (kind, row, index) => row.id ?? `demo_${{ payments: "pay", service: "svc", expenses: "exp", history: "h" }[kind]}_${String(index + 1).padStart(3, "0")}`;

const all = [];
// The pictures go in first, and come out last
const pictureKeys = out.pianos.map((piano) => piano.id.replace("demo_", ""));
for (const kind of Object.keys(out)) out[kind].forEach((row, index) => all.push({ kind, id: idFor(kind, row, index), row }));

const command = process.argv[2];
if ((command === "seed" || command === "remove") && (ACCOUNT_ID === "ACCOUNT_ID_NEEDED" || USERS_ROW === "USERS_ROW_NEEDED")) {
  console.error("Give the account: --account-id <Appwrite user ID> --users-row <its row in the users table>");
  process.exit(1);
}
if (command === "plan") {
  for (const kind of Object.keys(out)) console.log(kind.padEnd(10), out[kind].length);
  console.log("total".padEnd(10), all.length);
} else if (command === "seed") {
  let made = 0;
  let skipped = 0;
  for (const key of pictureKeys) {
    const result = cli([
      "storage", "create-file", "--bucket-id", BUCKET, "--file-id", `demo_img_${key}`,
      "--file", path.join(IMAGES, `demo_img_${key}.jpg`), ...permissions.flatMap((p) => ["--permissions", p]),
    ]);
    const text = `${result.stdout}${result.stderr}`;
    if (result.status !== 0 && !/already exists|409/i.test(text)) {
      console.error(`FAILED picture ${key}:
${text.slice(0, 600)}`);
      process.exit(1);
    }
  }
  console.log(`${pictureKeys.length} pictures ready`);
  for (const { kind, id, row } of all) {
    const result = cli([
      "tablesdb", "create-row", "--database-id", DB, "--table-id", T[kind], "--row-id", id,
      "--data", JSON.stringify(row.data), ...permissions.flatMap((p) => ["--permissions", p]),
    ]);
    const text = `${result.stdout}${result.stderr}`;
    if (result.status === 0) made++;
    else if (/already exists|409/i.test(text)) skipped++;
    else {
      console.error(`FAILED ${kind} ${id}:\n${text.slice(0, 600)}`);
      process.exit(1);
    }
    if ((made + skipped) % 20 === 0) console.log(`${made + skipped} / ${all.length}`);
  }
  console.log(`done: ${made} made, ${skipped} already there`);
} else if (command === "remove") {
  let gone = 0;
  for (const { kind, id } of [...all].reverse()) {
    const result = cli(["tablesdb", "delete-row", "--database-id", DB, "--table-id", T[kind], "--row-id", id]);
    if (result.status === 0) gone++;
  }
  let pictures = 0;
  for (const key of pictureKeys) {
    if (cli(["storage", "delete-file", "--bucket-id", BUCKET, "--file-id", `demo_img_${key}`]).status === 0) pictures++;
  }
  console.log(`removed ${gone} of ${all.length} rows and ${pictures} of ${pictureKeys.length} pictures`);
} else {
  console.log("node scripts/demo/demo-data.js plan | seed | remove  [--account-id ID --users-row ID]");
}
