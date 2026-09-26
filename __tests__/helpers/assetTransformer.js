// jest-expo turns every image into `module.exports = 1`, so all icons look the
// same in tests. Give each asset its own numeric id instead (like Metro's asset
// registry does in the app), so tests can find e.g. the trash icon.
const crypto = require("crypto");
const path = require("path");

const hash = (value) => crypto.createHash("md5").update(value).digest("hex");

module.exports = {
  process: (_source, filename) => ({
    code: `module.exports = ${parseInt(hash(path.basename(filename)).slice(0, 8), 16)};`,
  }),
  getCacheKey: (source, filename) =>
    hash(`${hash(__filename)}:${filename}:${hash(source)}`),
};
