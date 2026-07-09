// Phase 2 of the v2→v3 Crowdin sort-out (pure-local, no API): fold translation
// edits made on the Crowdin ROOT (v2) copies of the three multilingual CSVs
// into the repo's locale/*.csv, which are the source of truth going forward.
//
// Policy: the English column and row set/order are never touched. For each
// language cell, a non-empty Crowdin value wins (translator edits are newer
// than the repo columns); every case where BOTH sides had different non-empty
// values is logged for human review.
//
//   yarn tsx scripts/crowdin/merge-csv-translations.ts
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

const REPO = path.join(__dirname, "..", "..");
const BACKUP_BUILD = path.join(REPO, "crowdin-backup", "2026-07-09", "root-build");
const REPORTS = path.join(REPO, "crowdin-backup", "2026-07-09", "reports");
const FILES = ["genres.csv", "roles.csv", "accessProtocols.csv"];
const KEY_COLUMNS = ["ID", "Context", "en"]; // those that exist in a given file
const conflicts: string[][] = [["file", "key", "column", "repo", "crowdin", "action"]];

function parseCsv(filePath: string): { rows: string[][]; hadBom: boolean; eol: string } {
  const raw = fs.readFileSync(filePath, "utf8");
  const hadBom = raw.charCodeAt(0) === 0xfeff;
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const res = Papa.parse<string[]>(hadBom ? raw.slice(1) : raw, { skipEmptyLines: true });
  if (res.errors.length) {
    throw new Error(`${filePath}: ${JSON.stringify(res.errors.slice(0, 3))}`);
  }
  return { rows: res.data, hadBom, eol };
}

function keyOf(header: string[], row: string[]): string {
  return header
    .map((h, i) => (KEY_COLUMNS.includes(h) ? row[i] : null))
    .filter((v) => v !== null)
    .join("");
}

for (const name of FILES) {
  const repoPath = path.join(REPO, "locale", name);
  const crowdinPath = path.join(BACKUP_BUILD, name);
  const repo = parseCsv(repoPath);
  const crowdin = parseCsv(crowdinPath);
  const header = repo.rows[0];
  if (header.join("|") !== crowdin.rows[0].join("|")) {
    throw new Error(`${name}: header mismatch\n repo:    ${header}\n crowdin: ${crowdin.rows[0]}`);
  }
  const langCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !KEY_COLUMNS.includes(h));
  if (langCols.length !== 7) throw new Error(`${name}: expected 7 language columns, got ${langCols.length} (${langCols.map((c) => c.h)})`);

  // key -> queue of crowdin rows (queue handles duplicate keys in order)
  const crowdinByKey = new Map<string, string[][]>();
  for (const row of crowdin.rows.slice(1)) {
    const k = keyOf(header, row);
    if (!crowdinByKey.has(k)) crowdinByKey.set(k, []);
    crowdinByKey.get(k)!.push(row);
  }

  let filled = 0;
  let overwritten = 0;
  let unmatched = 0;
  for (const row of repo.rows.slice(1)) {
    const k = keyOf(header, row);
    const match = crowdinByKey.get(k)?.shift();
    if (!match) {
      unmatched++; // row is new in the repo; nothing to merge
      continue;
    }
    for (const { h, i } of langCols) {
      const ours = (row[i] ?? "").trim();
      const theirs = (match[i] ?? "").trim();
      if (theirs === "" || theirs === ours) continue;
      if (ours === "") {
        row[i] = theirs;
        filled++;
      } else {
        conflicts.push([name, k.replaceAll("", " | "), h, ours, theirs, "took crowdin"]);
        row[i] = theirs;
        overwritten++;
      }
    }
  }

  const csv = Papa.unparse(repo.rows, { quotes: true, newline: repo.eol });
  fs.writeFileSync(repoPath, (repo.hadBom ? "﻿" : "") + csv + repo.eol);
  console.log(
    `${name}: ${repo.rows.length - 1} rows; filled ${filled} empty cells, took crowdin on ${overwritten} conflicts, ${unmatched} repo-only rows`
  );
}

fs.mkdirSync(REPORTS, { recursive: true });
const reportPath = path.join(REPORTS, "csv-merge-conflicts.csv");
fs.writeFileSync(reportPath, Papa.unparse(conflicts, { quotes: true }) + "\n");
console.log(`${conflicts.length - 1} conflicts logged to ${reportPath}`);
