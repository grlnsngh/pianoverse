/**
 * What Pianoverse expects of its Appwrite project, in one place: the tables,
 * columns, indexes and permissions, and the photo bucket, as pulled from the
 * live project into appwrite/project.json (`appwrite pull tables` and
 * `appwrite pull buckets`).
 *
 * Two things use it:
 *  - `npm run check:appwrite` (scripts/check-appwrite.js) pulls the live
 *    project again and lists what differs, so a table made with the wrong ID
 *    or a column that was never added is found before a person meets it.
 *  - the tests' stand-in for Appwrite (__tests__/helpers/fakeAppwrite.ts)
 *    refuses what the real project would refuse: a table that isn't there, a
 *    column it doesn't have, a missing required value, the wrong type, text
 *    that is too long.
 */
const fs = require("fs");
const path = require("path");

const PROJECT_FILE = path.join(__dirname, "..", "appwrite", "project.json");

const loadProject = (file = PROJECT_FILE) => JSON.parse(fs.readFileSync(file, "utf8"));

const describeColumn = (column) => {
  const parts = [column.type];
  if (column.size) parts.push(`size ${column.size}`);
  if (column.format) parts.push(column.format);
  if (column.array) parts.push("array");
  parts.push(column.required ? "required" : "optional");
  return parts.join(", ");
};

const sameList = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/**
 * What differs between the project the app expects and the live one, in
 * words, or an empty list when they agree.
 */
const compareProjects = (expected, live) => {
  const differences = [];
  const liveTables = new Map((live.tables ?? []).map((table) => [table.$id, table]));

  for (const table of expected.tables ?? []) {
    const label = `Table ${table.name} (${table.$id})`;
    const found = liveTables.get(table.$id);
    liveTables.delete(table.$id);
    if (!found) {
      const sameName = (live.tables ?? []).find((other) => other.name === table.name);
      differences.push(
        sameName
          ? `${label} is missing; a table named ${table.name} exists with the ID ${sameName.$id} instead`
          : `${label} is missing`
      );
      continue;
    }
    if (found.rowSecurity !== table.rowSecurity) {
      differences.push(`${label}: row security is ${found.rowSecurity ? "on" : "off"}, expected ${table.rowSecurity ? "on" : "off"}`);
    }
    if (!sameList(found.$permissions, table.$permissions)) {
      differences.push(`${label}: permissions are ${JSON.stringify(found.$permissions)}, expected ${JSON.stringify(table.$permissions)}`);
    }

    const liveColumns = new Map((found.columns ?? []).map((column) => [column.key, column]));
    for (const column of table.columns ?? []) {
      const other = liveColumns.get(column.key);
      liveColumns.delete(column.key);
      if (!other) {
        differences.push(`${label}: column ${column.key} (${describeColumn(column)}) is missing`);
      } else if (describeColumn(other) !== describeColumn(column)) {
        differences.push(`${label}: column ${column.key} is ${describeColumn(other)}, expected ${describeColumn(column)}`);
      }
    }
    for (const extra of liveColumns.values()) {
      differences.push(`${label}: column ${extra.key} (${describeColumn(extra)}) is in Appwrite but not in appwrite/project.json`);
    }

    const liveIndexes = new Map((found.indexes ?? []).map((index) => [index.key, index]));
    for (const index of table.indexes ?? []) {
      const other = liveIndexes.get(index.key);
      liveIndexes.delete(index.key);
      if (!other) differences.push(`${label}: index ${index.key} (${index.columns.join(", ")}) is missing`);
      else if (other.type !== index.type || other.columns.join() !== index.columns.join()) {
        differences.push(`${label}: index ${index.key} is ${other.type} on ${other.columns.join(", ")}, expected ${index.type} on ${index.columns.join(", ")}`);
      }
    }
    for (const extra of liveIndexes.values()) {
      differences.push(`${label}: index ${extra.key} is in Appwrite but not in appwrite/project.json`);
    }
  }
  for (const extra of liveTables.values()) {
    differences.push(`Table ${extra.name} (${extra.$id}) is in Appwrite but not in appwrite/project.json`);
  }

  const liveBuckets = new Map((live.buckets ?? []).map((bucket) => [bucket.$id, bucket]));
  for (const bucket of expected.buckets ?? []) {
    const label = `Bucket ${bucket.name} (${bucket.$id})`;
    const found = liveBuckets.get(bucket.$id);
    if (!found) {
      differences.push(`${label} is missing`);
      continue;
    }
    if (found.fileSecurity !== bucket.fileSecurity) {
      differences.push(`${label}: file security is ${found.fileSecurity ? "on" : "off"}, expected ${bucket.fileSecurity ? "on" : "off"}`);
    }
    if (!sameList(found.$permissions, bucket.$permissions)) {
      differences.push(`${label}: permissions are ${JSON.stringify(found.$permissions)}, expected ${JSON.stringify(bucket.$permissions)}`);
    }
    if (found.enabled !== bucket.enabled) differences.push(`${label} is ${found.enabled ? "enabled" : "disabled"}`);
  }

  return differences;
};

const invalid = (message) => `Invalid document structure: ${message}`;

const STRING_TYPES = new Set(["string", "varchar", "text", "mediumtext", "longtext"]);

/** Why one value can't be stored in `column`, or null. */
const valueProblem = (column, value) => {
  const { key, type } = column;
  if (STRING_TYPES.has(type)) {
    if (typeof value !== "string") return invalid(`Attribute "${key}" has invalid type. Value must be a valid string`);
    if (column.size && value.length > column.size) {
      return invalid(`Attribute "${key}" has invalid type. Value must be a valid string and no longer than ${column.size} chars`);
    }
    if (column.format === "email" && !/^[^\s@]+@[^\s@]+$/.test(value)) {
      return invalid(`Attribute "${key}" has invalid format. Value must be a valid email address`);
    }
    if (column.format === "url" && !/^https?:\/\/\S+$/i.test(value)) {
      return invalid(`Attribute "${key}" has invalid format. Value must be a valid URL`);
    }
    return null;
  }
  if (type === "double" || type === "float") {
    return typeof value === "number" && Number.isFinite(value)
      ? null
      : invalid(`Attribute "${key}" has invalid type. Value must be a valid float`);
  }
  if (type === "integer" || type === "bigint") {
    if (!Number.isInteger(value)) return invalid(`Attribute "${key}" has invalid type. Value must be a valid integer`);
    if ((column.min !== undefined && value < column.min) || (column.max !== undefined && value > column.max)) {
      return invalid(`Attribute "${key}" has invalid type. Value must be a valid range between ${column.min} and ${column.max}`);
    }
    return null;
  }
  if (type === "datetime") {
    const ok = value instanceof Date ? !Number.isNaN(value.getTime()) : typeof value === "string" && !Number.isNaN(Date.parse(value));
    return ok ? null : invalid(`Attribute "${key}" has invalid type. Value must be a valid date`);
  }
  if (type === "boolean") {
    return typeof value === "boolean" ? null : invalid(`Attribute "${key}" has invalid type. Value must be a valid boolean`);
  }
  if (type === "relationship") {
    return typeof value === "string" || (value && typeof value === "object")
      ? null
      : invalid(`Attribute "${key}" has invalid type. Value must be a valid relationship`);
  }
  return null;
};

/**
 * Why Appwrite would refuse to store `data` in `table`, or null. `creating` is
 * true for a new row (every required column must then be given).
 */
const rowProblem = (table, data, { creating }) => {
  const columns = new Map(table.columns.map((column) => [column.key, column]));
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("$")) continue;
    const column = columns.get(key);
    if (!column) return invalid(`Unknown attribute: "${key}"`);
    if (value === null || value === undefined) {
      if (column.required) return invalid(`Missing required attribute "${key}"`);
      continue;
    }
    if (column.array) {
      if (!Array.isArray(value)) return invalid(`Attribute "${key}" must be an array`);
      for (const item of value) {
        const problem = valueProblem(column, item);
        if (problem) return problem;
      }
      continue;
    }
    const problem = valueProblem(column, value);
    if (problem) return problem;
  }
  if (creating) {
    for (const column of table.columns) {
      if (column.required && (data[column.key] === undefined || data[column.key] === null)) {
        return invalid(`Missing required attribute "${column.key}"`);
      }
    }
  }
  return null;
};

module.exports = { PROJECT_FILE, compareProjects, loadProject, rowProblem };
