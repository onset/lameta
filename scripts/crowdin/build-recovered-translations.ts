// Phase 4 of the v2→v3 Crowdin sort-out: build per-language PO files
// containing ONLY translations for strings that are currently empty on the
// target branch, recovered from (in priority order):
//   messages.po: 1) the Phase-0 backup's root (v2) per-language build
//                2) the current local locale/<folder>/messages.po
//   fields.po:   1) exact-English-text match against the v2 multilingual CSVs
//                   (fields.csv + choices.csv + tips.csv) from the backup
//                2) msgctxt+msgid match against the stale locale/pt|zh dirs
// Output: scripts/crowdin/staging/<folder>/{messages,fields}.po (only filled
// entries) + an audit trail in crowdin-backup/2026-07-09/reports/.
// Nothing is uploaded by this script; upload with crowdin-staging.yml.
//
//   yarn tsx scripts/crowdin/build-recovered-translations.ts <branchName> [langId,...]
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import gettextParser from "gettext-parser";
import {
  PROJECT_ID,
  LANGS,
  api,
  apiAll,
  downloadToFile,
  loadPo,
  poEntries,
  entryKey,
  sleep
} from "./lib";

const REPO = path.join(__dirname, "..", "..");
const BACKUP = path.join(REPO, "crowdin-backup", "2026-07-09");
const STAGING = path.join(__dirname, "staging");
// crowdinId -> folder name used inside the v2 root build zip
const ROOT_BUILD_FOLDER: Record<string, string> = {
  "es-ES": "es", fr: "fr", ru: "ru", "zh-CN": "zh", "pt-BR": "pt", id: "id", fa: "fa"
};
// stale local dirs that hold fields translations not elsewhere on disk
const STALE_DIR: Record<string, string> = { "pt-BR": "pt", "zh-CN": "zh" };

interface Fill { msgctxt: string; msgid: string; msgstr: string; source: string }

function loadCsvTextMap(): Map<string, Record<string, string>> {
  // English text -> { csvColumn: translation } from the v2 CSVs
  const map = new Map<string, Record<string, string>>();
  for (const name of ["fields.csv", "choices.csv", "tips.csv"]) {
    const p = path.join(BACKUP, "root-build", name);
    const raw = fs.readFileSync(p, "utf8").replace(/^﻿/, "");
    const rows = Papa.parse<string[]>(raw, { skipEmptyLines: true }).data;
    const header = rows[0];
    const enIdx = header.findIndex((h) => h.toLowerCase() === "en");
    for (const row of rows.slice(1)) {
      const en = (row[enIdx] ?? "").trim();
      if (!en) continue;
      const existing = map.get(en) ?? {};
      header.forEach((h, i) => {
        if (i !== enIdx && LANGS.some((l) => l.csvColumn === h) && (row[i] ?? "").trim()) {
          // first occurrence wins; identical English rows share translations anyway
          if (!existing[h]) existing[h] = row[i].trim();
        }
      });
      map.set(en, existing);
    }
  }
  return map;
}

async function exportBranchFile(branchId: number, files: any[], name: string, langId: string, dest: string) {
  const file = files.find((f) => f.branchId === branchId && path.basename(f.path) === name);
  if (!file) throw new Error(`${name} not found on branch ${branchId}`);
  const res = (
    await api(`/projects/${PROJECT_ID}/translations/exports`, {
      method: "POST",
      body: { targetLanguageId: langId, fileIds: [file.id] }
    })
  ).data;
  await downloadToFile(res.url, dest);
}

function writeStagingPo(langFolder: string, set: string, fills: Fill[]) {
  const translations: any = { "": {} };
  for (const f of fills) {
    translations[f.msgctxt] ??= {};
    translations[f.msgctxt][f.msgid] = {
      msgctxt: f.msgctxt || undefined,
      msgid: f.msgid,
      msgstr: [f.msgstr]
    };
  }
  const po = gettextParser.po.compile({
    charset: "utf-8",
    headers: {
      "content-type": "text/plain; charset=utf-8",
      language: langFolder,
      "mime-version": "1.0",
      "content-transfer-encoding": "8bit"
    },
    translations
  });
  const dest = path.join(STAGING, langFolder, `${set}.po`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, po);
}

async function main() {
  const branchName = process.argv[2];
  if (!branchName) throw new Error("usage: build-recovered-translations.ts <branchName> [langId,...]");
  const langFilter = process.argv[3]?.split(",");
  const langs = LANGS.filter((l) => !langFilter || langFilter.includes(l.crowdinId));

  const branches = await apiAll(`/projects/${PROJECT_ID}/branches?name=${encodeURIComponent(branchName)}`);
  if (!branches.length) throw new Error(`no branch named ${branchName}`);
  const branchId = branches[0].id;
  const files = await apiAll(`/projects/${PROJECT_ID}/files?recursion=1`);

  const enMessages = poEntries(loadPo(path.join(REPO, "locale", "en", "messages.po")));
  const enFields = poEntries(loadPo(path.join(REPO, "locale", "en", "fields.po")));
  const csvTextMap = loadCsvTextMap();
  const report: any = { branch: branchName, langs: {} };

  for (const lang of langs) {
    const rep: any = {};
    // what is currently untranslated on the target branch?
    const exportDir = path.join(STAGING, "_branch-exports", branchName, lang.crowdinId);
    for (const set of ["messages", "fields"]) {
      await exportBranchFile(branchId, files, `${set}.po`, lang.crowdinId, path.join(exportDir, `${set}.po`));
      await sleep(150);
    }
    const branchMessages = new Map(
      poEntries(loadPo(path.join(exportDir, "messages.po"))).map((e) => [entryKey(e.msgctxt, e.msgid), e.msgstr])
    );
    const branchFields = new Map(
      poEntries(loadPo(path.join(exportDir, "fields.po"))).map((e) => [entryKey(e.msgctxt, e.msgid), e.msgstr])
    );

    // ---- messages.po ----
    const rootBuildPo = path.join(BACKUP, "root-build", ROOT_BUILD_FOLDER[lang.crowdinId], "messages.po");
    const rootMap = new Map(
      poEntries(loadPo(rootBuildPo)).filter((e) => e.msgstr.trim()).map((e) => [entryKey(e.msgctxt, e.msgid), e.msgstr])
    );
    const localFolder = STALE_DIR[lang.crowdinId] ?? lang.folder;
    const localPoPath = path.join(REPO, "locale", localFolder, "messages.po");
    const localMap = new Map(
      fs.existsSync(localPoPath)
        ? poEntries(loadPo(localPoPath)).filter((e) => e.msgstr.trim()).map((e) => [entryKey(e.msgctxt, e.msgid), e.msgstr])
        : []
    );
    const msgFills: Fill[] = [];
    for (const e of enMessages) {
      const k = entryKey(e.msgctxt, e.msgid);
      if ((branchMessages.get(k) ?? "").trim()) continue; // already translated on branch
      const fromRoot = rootMap.get(k);
      const fromLocal = localMap.get(k);
      if (fromRoot) msgFills.push({ ...e, msgstr: fromRoot, source: "v2-root-build" });
      else if (fromLocal) msgFills.push({ ...e, msgstr: fromLocal, source: "local-repo" });
    }
    rep.messages = {
      branchAlreadyTranslated: [...branchMessages.values()].filter((v) => v.trim()).length,
      filled: msgFills.length,
      bySource: msgFills.reduce((a: any, f) => ((a[f.source] = (a[f.source] ?? 0) + 1), a), {}),
      stillEmpty: enMessages.length - [...branchMessages.values()].filter((v) => v.trim()).length - msgFills.length
    };
    if (msgFills.length) writeStagingPo(lang.folder, "messages", msgFills);

    // ---- fields.po ----
    const staleFieldsPath = STALE_DIR[lang.crowdinId]
      ? path.join(REPO, "locale", STALE_DIR[lang.crowdinId], "fields.po")
      : undefined;
    const staleMap = new Map(
      staleFieldsPath && fs.existsSync(staleFieldsPath)
        ? poEntries(loadPo(staleFieldsPath)).filter((e) => e.msgstr.trim()).map((e) => [entryKey(e.msgctxt, e.msgid), e.msgstr])
        : []
    );
    const fieldFills: Fill[] = [];
    for (const e of enFields) {
      const k = entryKey(e.msgctxt, e.msgid);
      if ((branchFields.get(k) ?? "").trim()) continue;
      const fromCsv = csvTextMap.get(e.msgid.trim())?.[lang.csvColumn];
      const fromStale = staleMap.get(k);
      if (fromCsv) fieldFills.push({ ...e, msgstr: fromCsv, source: "v2-csv-text-match" });
      else if (fromStale) fieldFills.push({ ...e, msgstr: fromStale, source: "stale-local-dir" });
    }
    rep.fields = {
      branchAlreadyTranslated: [...branchFields.values()].filter((v) => v.trim()).length,
      filled: fieldFills.length,
      bySource: fieldFills.reduce((a: any, f) => ((a[f.source] = (a[f.source] ?? 0) + 1), a), {}),
      stillEmpty: enFields.length - [...branchFields.values()].filter((v) => v.trim()).length - fieldFills.length
    };
    if (fieldFills.length) writeStagingPo(lang.folder, "fields", fieldFills);

    report.langs[lang.crowdinId] = rep;
    console.log(
      `${lang.crowdinId.padEnd(6)} messages: +${rep.messages.filled} (had ${rep.messages.branchAlreadyTranslated}, ${rep.messages.stillEmpty} still empty)   fields: +${rep.fields.filled} (had ${rep.fields.branchAlreadyTranslated}, ${rep.fields.stillEmpty} still empty)`
    );
  }

  // copy the en sources into staging so crowdin-staging.yml can reference them
  fs.mkdirSync(path.join(STAGING, "en"), { recursive: true });
  for (const set of ["messages", "fields"]) {
    fs.copyFileSync(
      path.join(REPO, "locale", "en", `${set}.po`),
      path.join(STAGING, "en", `${set}.po`)
    );
  }

  const reportPath = path.join(BACKUP, "reports", `recovery-report-${branchName}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`report -> ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
