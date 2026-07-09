// Phase 5 of the v2→v3 Crowdin sort-out: delete the three leftover CSVs that
// were uploaded to the V3 branch in Dec 2023 before crowdin.yml was trimmed.
// They are obsolete in v3 (replaced by fields.po/vocabularies.po) and carry
// zero visible strings. Their live namesakes at the PROJECT ROOT belong to v2
// and must never be touched — hence the hard branch assertion on every
// candidate. Prints what it would do; add --force to actually delete.
//
//   yarn tsx scripts/crowdin/delete-v3-junk.ts [--force]
import * as path from "path";
import { PROJECT_ID, V3_BRANCH_ID, api, apiAll } from "./lib";

const JUNK_NAMES = ["choices.csv", "fields.csv", "tips.csv"];

async function main() {
  const force = process.argv.includes("--force");
  const files = await apiAll(`/projects/${PROJECT_ID}/files?recursion=1`);
  const candidates = files.filter((f) => JUNK_NAMES.includes(path.basename(f.path)));

  const toDelete: any[] = [];
  for (const f of candidates) {
    if (f.branchId !== V3_BRANCH_ID) {
      console.log(`SKIP (root/v2 — protected): ${f.path} (id ${f.id}, branchId ${f.branchId})`);
      continue;
    }
    toDelete.push(f);
  }
  if (toDelete.length !== JUNK_NAMES.length) {
    throw new Error(
      `expected exactly ${JUNK_NAMES.length} V3-branch junk files, found ${toDelete.length}: ${toDelete.map((f) => f.path)}`
    );
  }
  for (const f of toDelete) {
    if (force) {
      await api(`/projects/${PROJECT_ID}/files/${f.id}`, { method: "DELETE" });
      console.log(`DELETED ${f.path} (id ${f.id})`);
    } else {
      console.log(`would delete ${f.path} (id ${f.id}, branchId ${f.branchId}) — rerun with --force`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
