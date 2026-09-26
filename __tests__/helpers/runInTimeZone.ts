import { execFileSync } from "child_process";
import path from "path";

// Jest can't change the time zone of a running test, so this runs
// utils/dates.ts in a separate Node process with the given TZ.
const script = `
  const babel = require("@babel/core");
  const { code } = babel.transformFileSync("utils/dates.ts", {
    babelrc: false,
    configFile: false,
    presets: ["@babel/preset-typescript"],
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const mod = { exports: {} };
  new Function("module", "exports", "require", code)(mod, mod.exports, require);
  const { parseStoredDate, toStoredDate } = mod.exports;
  const values = JSON.parse(process.argv[1]);
  process.stdout.write(JSON.stringify(values.map((value) => {
    const date = parseStoredDate(value);
    return date && toStoredDate(date);
  })));
`;

/** The calendar day ("YYYY-MM-DD") each stored value means in `timeZone`. */
export const storedDaysInTimeZone = (timeZone: string, values: string[]) =>
  JSON.parse(
    execFileSync(process.execPath, ["-e", script, JSON.stringify(values)], {
      cwd: path.join(__dirname, "..", ".."),
      env: { ...process.env, TZ: timeZone },
    }).toString()
  ) as (string | null)[];
