// Read-only report of a Crowdin branch (or the project root): files, string
// counts (visible/hidden), and per-language translated counts. Used to verify
// every mutating phase of the v2→v3 sort-out, and handy forever after.
//
//   yarn tsx scripts/crowdin/report.ts V3
//   yarn tsx scripts/crowdin/report.ts --root
import { PROJECT_ID, api, apiAll } from "./lib";

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error("usage: report.ts <branchName> | --root");

  let branchId: number | undefined;
  if (arg !== "--root") {
    const branches = await apiAll(`/projects/${PROJECT_ID}/branches?name=${encodeURIComponent(arg)}`);
    if (!branches.length) throw new Error(`no branch named ${arg}`);
    branchId = branches[0].id;
    console.log(`Branch "${arg}" (id ${branchId})`);
  } else {
    console.log("Project root");
  }

  const allFiles = await apiAll(`/projects/${PROJECT_ID}/files?recursion=1`);
  const files = allFiles.filter((f) =>
    branchId ? f.branchId === branchId : !f.branchId
  );

  for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
    const strings = await apiAll(`/projects/${PROJECT_ID}/strings?fileId=${f.id}`);
    const hidden = strings.filter((s) => s.isHidden).length;
    const progress = (
      await api(`/projects/${PROJECT_ID}/files/${f.id}/languages/progress?limit=50`)
    ).data.map((d: any) => d.data);
    const perLang = progress
      .map((p: any) => `${p.languageId}:${p.phrases.translated}`)
      .join(" ");
    console.log(
      `${f.path.padEnd(28)} strings: ${String(strings.length).padStart(4)} (${hidden} hidden, ${
        strings.length - hidden
      } visible)  translated: ${perLang}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
