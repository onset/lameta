// Print msgid / non-empty-msgstr counts for every catalog under locale/,
// or compare two locale folders to prove one is subsumed by the other.
//
//   yarn tsx scripts/crowdin/po-stats.ts
//   yarn tsx scripts/crowdin/po-stats.ts --compare locale/pt locale/pt-BR
import * as fs from "fs";
import * as path from "path";
import { loadPo, poEntries, entryKey } from "./lib";

const LOCALE_ROOT = path.join(__dirname, "..", "..", "locale");
const SETS = ["messages", "fields", "vocabularies"];

function compare(staleDir: string, newDir: string): number {
  let missing = 0;
  for (const set of SETS) {
    const stalePath = path.join(staleDir, `${set}.po`);
    const newPath = path.join(newDir, `${set}.po`);
    if (!fs.existsSync(stalePath)) continue;
    const stale = poEntries(loadPo(stalePath)).filter((e) => e.msgstr.trim() !== "");
    const fresh = new Map(
      fs.existsSync(newPath)
        ? poEntries(loadPo(newPath)).map((e) => [entryKey(e.msgctxt, e.msgid), e.msgstr])
        : []
    );
    let covered = 0;
    for (const e of stale) {
      const nv = fresh.get(entryKey(e.msgctxt, e.msgid));
      if (nv && nv.trim() !== "") covered++;
      else {
        missing++;
        console.log(`  MISSING in ${newPath} [${set}]: ${JSON.stringify(e.msgid).slice(0, 90)}`);
      }
    }
    console.log(`${set}: ${covered}/${stale.length} stale translations covered by ${newDir}`);
  }
  return missing;
}

const args = process.argv.slice(2);
if (args[0] === "--compare") {
  const missing = compare(path.resolve(args[1]), path.resolve(args[2]));
  console.log(missing === 0 ? "OK: fully subsumed" : `NOT SUBSUMED: ${missing} missing`);
  process.exit(missing === 0 ? 0 : 1);
} else {
  for (const folder of fs.readdirSync(LOCALE_ROOT).sort()) {
    const dir = path.join(LOCALE_ROOT, folder);
    if (!fs.statSync(dir).isDirectory()) continue;
    const parts: string[] = [];
    for (const set of SETS) {
      const p = path.join(dir, `${set}.po`);
      if (!fs.existsSync(p)) {
        parts.push(`${set}: -`);
        continue;
      }
      const entries = poEntries(loadPo(p));
      const filled = entries.filter((e) => e.msgstr.trim() !== "").length;
      parts.push(`${set}: ${filled}/${entries.length}`);
    }
    console.log(`${folder.padEnd(8)} ${parts.join("   ")}`);
  }
}
