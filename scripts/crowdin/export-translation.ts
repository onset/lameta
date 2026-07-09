// Export one file's translations for one language from Crowdin (read-only)
// and report the number of non-empty msgstr / filled CSV cells.
//
//   yarn tsx scripts/crowdin/export-translation.ts <branchName|--root> <fileName> <langId> [outPath]
import * as fs from "fs";
import * as path from "path";
import { PROJECT_ID, api, apiAll, downloadToFile, countNonEmptyMsgstr } from "./lib";

async function main() {
  const [branchArg, fileName, langId, outArg] = process.argv.slice(2);
  if (!langId) throw new Error("usage: export-translation.ts <branchName|--root> <fileName> <langId> [outPath]");

  const files = await apiAll(`/projects/${PROJECT_ID}/files?recursion=1`);
  let branchId: number | undefined;
  if (branchArg !== "--root") {
    const branches = await apiAll(`/projects/${PROJECT_ID}/branches?name=${encodeURIComponent(branchArg)}`);
    if (!branches.length) throw new Error(`no branch named ${branchArg}`);
    branchId = branches[0].id;
  }
  const file = files.find(
    (f) =>
      path.basename(f.path) === fileName &&
      (branchId ? f.branchId === branchId : !f.branchId)
  );
  if (!file) throw new Error(`file ${fileName} not found on ${branchArg}`);

  const res = (
    await api(`/projects/${PROJECT_ID}/translations/exports`, {
      method: "POST",
      body: { targetLanguageId: langId, fileIds: [file.id] }
    })
  ).data;
  const out =
    outArg ??
    path.join(__dirname, "staging", "_probe", `${branchArg.replace("--", "")}-${langId}-${fileName}`);
  await downloadToFile(res.url, out);
  if (fileName.endsWith(".po")) {
    console.log(`${branchArg}/${fileName} [${langId}]: ${countNonEmptyMsgstr(out)} non-empty msgstr -> ${out}`);
  } else {
    console.log(`${branchArg}/${fileName} [${langId}] -> ${out}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
