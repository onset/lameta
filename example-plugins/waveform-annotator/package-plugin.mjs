// Packages this plugin folder into an installable lameta plugin archive.
//
// A .lmplug file is just a zip with a different extension — lameta's installer accepts it and
// unpacks it exactly like a zip. Run with:  node package-plugin.mjs
// Produces:  waveform-annotator-<version>.lmplug  in this folder.

import { createRequire } from "module";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";

const require = createRequire(import.meta.url);
const archiver = require("archiver");
const JSON5 = require("json5");

const here = path.dirname(fileURLToPath(import.meta.url));

const manifest = JSON5.parse(
  fs.readFileSync(path.join(here, "plugin.json5"), "utf8")
);
const outName = `waveform-annotator-${manifest.version}.lmplug`;
const outPath = path.join(here, outName);

// Files/folders to include (everything the plugin needs at runtime). We deliberately exclude
// this script and any previously-built archives.
const INCLUDE = [
  "plugin.json5",
  "index.html",
  "main.js",
  "styles.css",
  "lameta-plugin.css",
  "lametaPluginClient.js",
  "lib"
];

const output = fs.createWriteStream(outPath);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Wrote ${outName} (${archive.pointer()} bytes)`);
});
archive.on("warning", (err) => console.warn(err));
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
for (const entry of INCLUDE) {
  const full = path.join(here, entry);
  if (!fs.existsSync(full)) continue;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) archive.directory(full, entry);
  else archive.file(full, { name: entry });
}
archive.finalize();
