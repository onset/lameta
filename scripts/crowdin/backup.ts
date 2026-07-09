// Phase 0 of the v2→v3 Crowdin sort-out: download EVERYTHING from the Crowdin
// project into crowdin-backup/<date>/ so that any later mistake on Crowdin can
// be recovered from git. Read-only against Crowdin (exports/builds create
// temporary artifacts server-side but modify no content).
//
//   yarn tsx scripts/crowdin/backup.ts
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import {
  PROJECT_ID,
  V3_BRANCH_ID,
  TM_ID,
  GLOSSARY_ID,
  LANGS,
  api,
  apiAll,
  downloadToFile,
  sleep,
  countNonEmptyMsgstr,
  walk
} from "./lib";

const DATE = "2026-07-09";
const ROOT = path.join(__dirname, "..", "..", "crowdin-backup", DATE);

async function pollUntilFinished(statusPath: string): Promise<void> {
  for (let i = 0; i < 120; i++) {
    const res = await api(statusPath);
    const status = res.data.status;
    if (status === "finished") return;
    if (status === "failed") throw new Error(`${statusPath} export failed`);
    await sleep(2000);
  }
  throw new Error(`${statusPath} did not finish in time`);
}

async function main() {
  fs.mkdirSync(ROOT, { recursive: true });

  // 1. Manifest: project, branches, files
  console.log("Manifest...");
  const project = (await api(`/projects/${PROJECT_ID}`)).data;
  const branches = await apiAll(`/projects/${PROJECT_ID}/branches`);
  const files = await apiAll(`/projects/${PROJECT_ID}/files?recursion=1`);
  fs.writeFileSync(
    path.join(ROOT, "manifest.json"),
    JSON.stringify({ fetchedAt: DATE, project, branches, files }, null, 2)
  );
  console.log(`  ${files.length} files, ${branches.length} branches`);

  // 2. TM export (TMX)
  const tmxPath = path.join(ROOT, `tm-${TM_ID}.tmx`);
  if (!fs.existsSync(tmxPath)) {
    console.log("TM export...");
    const exp = (await api(`/tms/${TM_ID}/exports`, { method: "POST", body: { format: "tmx" } }))
      .data;
    await pollUntilFinished(`/tms/${TM_ID}/exports/${exp.identifier}`);
    const dl = (await api(`/tms/${TM_ID}/exports/${exp.identifier}/download`)).data;
    await downloadToFile(dl.url, tmxPath);
  }

  // 3. Glossary export (TBX)
  const tbxPath = path.join(ROOT, `glossary-${GLOSSARY_ID}.tbx`);
  if (!fs.existsSync(tbxPath)) {
    console.log("Glossary export...");
    const exp = (
      await api(`/glossaries/${GLOSSARY_ID}/exports`, { method: "POST", body: { format: "tbx" } })
    ).data;
    await pollUntilFinished(`/glossaries/${GLOSSARY_ID}/exports/${exp.identifier}`);
    const dl = (await api(`/glossaries/${GLOSSARY_ID}/exports/${exp.identifier}/download`)).data;
    await downloadToFile(dl.url, tbxPath);
  }

  // 4. Full translation builds: root (v2) and V3 branch
  for (const [label, branchId] of [
    ["root-build", undefined],
    ["v3-build", V3_BRANCH_ID]
  ] as const) {
    const dir = path.join(ROOT, label);
    if (fs.existsSync(dir)) continue;
    console.log(`Translation build: ${label}...`);
    const body: any = {
      skipUntranslatedStrings: false,
      skipUntranslatedFiles: false,
      exportApprovedOnly: false
    };
    if (branchId) body.branchId = branchId;
    const build = (await api(`/projects/${PROJECT_ID}/translations/builds`, {
      method: "POST",
      body
    })).data;
    await pollUntilFinished(`/projects/${PROJECT_ID}/translations/builds/${build.id}`);
    const dl = (await api(`/projects/${PROJECT_ID}/translations/builds/${build.id}/download`)).data;
    const zip = path.join(ROOT, `${label}.zip`);
    await downloadToFile(dl.url, zip);
    fs.mkdirSync(dir, { recursive: true });
    execFileSync("powershell.exe", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dir}' -Force`
    ]);
  }

  // 5. Every source file, root and V3
  console.log("Source files...");
  for (const f of files) {
    const branch = f.branchId === V3_BRANCH_ID ? "V3" : "root";
    const name = path.basename(f.path);
    const dest = path.join(ROOT, "sources", branch, name);
    if (fs.existsSync(dest)) continue;
    const dl = (await api(`/projects/${PROJECT_ID}/files/${f.id}/download`)).data;
    await downloadToFile(dl.url, dest);
    await sleep(150);
  }

  // 6. Per-file per-language translation exports
  console.log("Per-file per-language translation exports...");
  for (const f of files) {
    const branch = f.branchId === V3_BRANCH_ID ? "V3" : "root";
    const name = path.basename(f.path);
    for (const lang of LANGS) {
      const dest = path.join(ROOT, "translations", branch, lang.crowdinId, name);
      if (fs.existsSync(dest)) continue;
      const res = (
        await api(`/projects/${PROJECT_ID}/translations/exports`, {
          method: "POST",
          body: { targetLanguageId: lang.crowdinId, fileIds: [f.id] }
        })
      ).data;
      await downloadToFile(res.url, dest);
      await sleep(200);
    }
    console.log(`  ${branch}/${name}`);
  }

  // 7. Strings dump per file (id, text, context, isHidden — needed later for
  //    verification and as a fallback for API-level translation uploads)
  console.log("Strings dumps...");
  for (const f of files) {
    const branch = f.branchId === V3_BRANCH_ID ? "V3" : "root";
    const name = path.basename(f.path);
    const dest = path.join(ROOT, "strings", branch, `${name}.json`);
    if (fs.existsSync(dest)) continue;
    const strings = await apiAll(`/projects/${PROJECT_ID}/strings?fileId=${f.id}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(
      dest,
      JSON.stringify(
        strings.map((s: any) => ({
          id: s.id,
          identifier: s.identifier,
          text: s.text,
          context: s.context,
          isHidden: s.isHidden
        })),
        null,
        1
      )
    );
  }

  // ---- Verification ----
  console.log("\n==== VERIFICATION ====");
  const tmx = fs.readFileSync(tmxPath, "utf8");
  const tuCount = (tmx.match(/<tu[ >]/g) ?? []).length;
  console.log(`TMX translation units: ${tuCount} (expected ~2514)`);

  const rootBuild = path.join(ROOT, "root-build");
  const messagesPos = walk(rootBuild).filter((p) => p.endsWith("messages.po"));
  for (const p of messagesPos) {
    console.log(
      `root-build ${path.relative(rootBuild, p)}: ${countNonEmptyMsgstr(p)} non-empty msgstr`
    );
  }
  const genres = walk(rootBuild).filter((p) => p.endsWith("genres.csv"));
  for (const p of genres) {
    const rows = fs.readFileSync(p, "utf8").trim().split("\n").length - 1;
    console.log(`root-build ${path.relative(rootBuild, p)}: ${rows} data rows`);
  }
  console.log("Backup root:", ROOT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
